import { create } from 'zustand';
import { messageForAuthError } from '../services/authErrors';
import { waitForInitialSync } from '../services/sync/waitForInitialSync';

import { syncRepo } from '../database/repositories/syncRepo';
import { authService } from '../services/authService';
import { cloudSyncService, type CloudSyncStatus } from '../services/cloudSyncService';
import { pushNotificationService } from '../services/pushNotificationService';
import { useAppStore } from './appStore';

type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn';
export type AccountRole = 'owner' | 'tenant';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  role: AccountRole | null;
  offlineMode: boolean;
  error: string | null;
  syncError: string | null;
  syncLastCompletedAt: string | null;
  syncPendingCount: number;
  syncStatus: CloudSyncStatus;
  initialize: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  startTenantGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  continueOffline: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearError: () => void;
};

let sessionGeneration = 0;
let activeSubscription = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  error: null,
  offlineMode: false,
  syncError: null,
  syncLastCompletedAt: null,
  syncPendingCount: 0,
  syncStatus: 'disabled',
  status: authService.isConfigured ? 'loading' : 'disabled',
  user: null,
  role: null,

  initialize() {
    const subscription = ++sessionGeneration;
    activeSubscription = subscription;
    let disposed = false;
    let readinessTimer: ReturnType<typeof setTimeout> | undefined;
    const clearReadinessTimer = () => {
      if (readinessTimer) clearTimeout(readinessTimer);
      readinessTimer = undefined;
    };
    if (!authService.isConfigured) {
      cloudSyncService.stop();
      useAppStore.getState().resetSession();
      set({ offlineMode: false, role: null, status: 'disabled', syncStatus: 'disabled', user: null });
      return () => undefined;
    }

    set({ error: null, status: 'loading' });
    // Some Android images never deliver an initial Firebase auth callback when
    // Google services are unhealthy. Keep local records reachable in that case.
    readinessTimer = setTimeout(() => {
      if (disposed || activeSubscription !== subscription || get().status !== 'loading') return;
      set({
        error: 'Cloud sign-in is taking too long. You can continue offline and sync later.',
        status: 'signedOut',
      });
    }, 8000);
    try {
      const unsubscribe = authService.subscribe(async firebaseUser => {
        if (disposed || activeSubscription !== subscription) return;
        const generation = ++sessionGeneration;
        const isCurrent = () => !disposed && generation === sessionGeneration;
        if (!firebaseUser) {
          clearReadinessTimer();
          pushNotificationService.stopForSignOut().catch(() => undefined);
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({
            offlineMode: false,
            role: null,
            status: 'signedOut',
            syncError: null,
            syncLastCompletedAt: null,
            syncPendingCount: 0,
            syncStatus: 'disabled',
            user: null,
          });
          return;
        }

        if (firebaseUser.isAnonymous) {
          clearReadinessTimer();
          pushNotificationService.stopForSignOut().catch(() => undefined);
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({
            error: null,
            offlineMode: false,
            role: 'tenant',
            status: 'signedIn',
            syncError: null,
            syncLastCompletedAt: null,
            syncPendingCount: 0,
            syncStatus: 'disabled',
            user: {
              displayName: null,
              email: null,
              isAnonymous: true,
              photoURL: null,
              uid: firebaseUser.uid,
            },
          });
          return;
        }

        try {
          const localOwner = await syncRepo.localOwner();
          if (!isCurrent()) return;
          if (localOwner && localOwner !== firebaseUser.uid) {
            await authService.signOut();
            set({
              error: 'This device data belongs to another account. Sign in with the original account.',
              role: null,
              status: 'signedOut',
              user: null,
            });
            return;
          }

          await syncRepo.claimLocalData(firebaseUser.uid);
          if (!isCurrent()) return;
          const initialSync = cloudSyncService.start(firebaseUser.uid, {
            onDataChanged: async () => {
              if (isCurrent()) {
                await useAppStore.getState().bootstrap().catch(error => {
                  if (isCurrent()) set({ syncError: messageForAuthError(error) });
                });
              }
            },
            onState: syncState => { if (isCurrent()) set({
              syncError: syncState.error,
              syncLastCompletedAt: syncState.lastSyncedAt,
              syncPendingCount: syncState.pendingCount,
              syncStatus: syncState.status,
            }); },
          });
          await waitForInitialSync(initialSync);
          if (!isCurrent()) return;
          await useAppStore.getState().bootstrap();
          if (!isCurrent()) return;
          set({
            error: null,
            offlineMode: false,
            role: 'owner',
            status: 'signedIn',
            user: {
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              isAnonymous: false,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
            },
          });
          clearReadinessTimer();
          pushNotificationService.resume(firebaseUser.uid).catch(() => undefined);
        } catch (error) {
          if (!isCurrent()) return;
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({ error: messageForAuthError(error), role: null, status: 'signedOut', user: null });
          clearReadinessTimer();
        }
      });
      return () => {
        disposed = true;
        clearReadinessTimer();
        unsubscribe();
        // A newer subscription owns its own sync lifecycle.
        if (activeSubscription === subscription) {
          sessionGeneration += 1;
          cloudSyncService.stop();
        }
      };
    } catch (error) {
      clearReadinessTimer();
      set({ error: messageForAuthError(error), role: null, status: 'signedOut', user: null });
      return () => undefined;
    }
  },

  async continueOffline() {
    const generation = ++sessionGeneration;
    cloudSyncService.stop();
    const signedOutStatus = authService.isConfigured ? 'signedOut' : 'disabled';
    set({ error: null, status: 'loading' });
    try {
      const bootstrapped = await useAppStore.getState().bootstrap();
      if (!bootstrapped || generation !== sessionGeneration) return;
      set({ offlineMode: true, role: 'owner', status: signedOutStatus });
    } catch (error) {
      if (generation !== sessionGeneration) return;
      useAppStore.getState().resetSession();
      set({ error: messageForAuthError(error), offlineMode: false, status: signedOutStatus });
    }
  },

  async signInWithGoogle() {
    set({ error: null, status: 'loading' });
    try {
      const result = await authService.signInWithGoogle();
      if (!result) {
        set({ status: 'signedOut' });
      }
    } catch (error) {
      set({ error: messageForAuthError(error), status: 'signedOut' });
    }
  },

  async startTenantGuest() {
    set({ error: null, offlineMode: false, status: 'loading' });
    try {
      await authService.signInAnonymously();
    } catch (error) {
      set({ error: messageForAuthError(error), role: null, status: 'signedOut' });
    }
  },

  async signInWithEmail(email, password) {
    set({ error: null, status: 'loading' });
    try {
      await authService.signInWithEmail(email, password);
    } catch (error) {
      set({ error: messageForAuthError(error), status: 'signedOut' });
    }
  },

  async createAccount(email, password) {
    set({ error: null, status: 'loading' });
    try {
      await authService.createAccount(email, password);
    } catch (error) {
      set({ error: messageForAuthError(error), status: 'signedOut' });
    }
  },

  async signOut() {
    const previousGeneration = sessionGeneration;
    const previousStatus = get().status;
    const generation = ++sessionGeneration;
    set({ error: null, offlineMode: false, role: null, status: 'loading' });
    try {
      await pushNotificationService.stopForSignOut(get().user?.uid).catch(() => undefined);
      await authService.signOut();
      cloudSyncService.stop();
      useAppStore.getState().resetSession();
      set({
        status: 'signedOut',
        role: null,
        syncError: null,
        syncLastCompletedAt: null,
        syncPendingCount: 0,
        syncStatus: 'disabled',
        user: null,
      });
    } catch (error) {
      if (generation !== sessionGeneration) return;
      sessionGeneration = previousGeneration;
      set({ error: messageForAuthError(error), status: previousStatus });
    }
  },

  async syncNow() {
    const generation = sessionGeneration;
    try {
      const success = await cloudSyncService.sync(false);
      if (success && generation === sessionGeneration && get().user) {
        await useAppStore.getState().bootstrap();
      }
    } catch (error) {
      if (generation === sessionGeneration) set({ syncError: messageForAuthError(error) });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
