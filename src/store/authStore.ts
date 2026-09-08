import { create } from 'zustand';
import { messageForAuthError } from '../services/authErrors';
import { waitForInitialSync } from '../services/sync/waitForInitialSync';

import { syncRepo } from '../database/repositories/syncRepo';
import { authService } from '../services/authService';
import { cloudSyncService, type CloudSyncStatus } from '../services/cloudSyncService';
import { useAppStore } from './appStore';

type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
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

  initialize() {
    const subscription = ++sessionGeneration;
    activeSubscription = subscription;
    let disposed = false;
    if (!authService.isConfigured) {
      cloudSyncService.stop();
      useAppStore.getState().resetSession();
      set({ offlineMode: false, status: 'disabled', syncStatus: 'disabled', user: null });
      return () => undefined;
    }

    set({ error: null, status: 'loading' });
    try {
      const unsubscribe = authService.subscribe(async firebaseUser => {
        if (disposed || activeSubscription !== subscription) return;
        const generation = ++sessionGeneration;
        const isCurrent = () => !disposed && generation === sessionGeneration;
        if (!firebaseUser) {
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({
            offlineMode: false,
            status: 'signedOut',
            syncError: null,
            syncLastCompletedAt: null,
            syncPendingCount: 0,
            syncStatus: 'disabled',
            user: null,
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
            status: 'signedIn',
            user: {
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
            },
          });
        } catch (error) {
          if (!isCurrent()) return;
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({ error: messageForAuthError(error), status: 'signedOut', user: null });
        }
      });
      return () => {
        disposed = true;
        unsubscribe();
        // A newer subscription owns its own sync lifecycle.
        if (activeSubscription === subscription) {
          sessionGeneration += 1;
          cloudSyncService.stop();
        }
      };
    } catch (error) {
      set({ error: messageForAuthError(error), status: 'signedOut', user: null });
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
      set({ offlineMode: true, status: signedOutStatus });
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
    set({ error: null, offlineMode: false, status: 'loading' });
    try {
      await authService.signOut();
      cloudSyncService.stop();
      useAppStore.getState().resetSession();
      set({
        status: 'signedOut',
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
