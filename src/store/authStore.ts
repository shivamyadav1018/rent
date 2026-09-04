import { create } from 'zustand';
import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

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

const messageForError = (error: unknown) => {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play services is unavailable or needs an update.';
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return 'Google sign-in is already open.';
    }
  }

  if (typeof error === 'object' && error && 'code' in error) {
    const code = String(error.code);
    if (code === 'auth/network-request-failed') {
      return 'No internet connection. Your offline records are still available.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'This sign-in method is not enabled in Firebase Authentication.';
    }
    if (code === 'auth/invalid-credential') {
      return 'The sign-in credentials are invalid. Please try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account already exists for this email.';
    }
    if (code === 'auth/invalid-email') {
      return 'Enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
      return 'Use a password with at least 6 characters.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to connect your Google account. Please try again.';
};

export const useAuthStore = create<AuthState>((set) => ({
  error: null,
  offlineMode: false,
  syncError: null,
  syncLastCompletedAt: null,
  syncPendingCount: 0,
  syncStatus: 'disabled',
  status: authService.isConfigured ? 'loading' : 'disabled',
  user: null,

  initialize() {
    if (!authService.isConfigured) {
      cloudSyncService.stop();
      useAppStore.getState().resetSession();
      set({ offlineMode: false, status: 'disabled', syncStatus: 'disabled', user: null });
      return () => undefined;
    }

    set({ error: null, status: 'loading' });
    try {
      return authService.subscribe(async firebaseUser => {
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
          if (localOwner && localOwner !== firebaseUser.uid) {
            await authService.signOut();
            set({
              error: 'This device data belongs to another Google account. Sign in with the original account.',
              status: 'signedOut',
              user: null,
            });
            return;
          }

          await syncRepo.claimLocalData(firebaseUser.uid);
          const initialSync = cloudSyncService.start(firebaseUser.uid, {
            onDataChanged: () => {
              useAppStore.getState().refreshAll();
            },
            onState: syncState => set({
              syncError: syncState.error,
              syncLastCompletedAt: syncState.lastSyncedAt,
              syncPendingCount: syncState.pendingCount,
              syncStatus: syncState.status,
            }),
          });
          // Native Firestore waits for server acknowledgement when writes are
          // queued offline. Do not hold the entire app loading screen hostage;
          // the active sync continues and completes after connectivity returns.
          await Promise.race([
            initialSync,
            new Promise<void>(resolve => setTimeout(() => resolve(), 4000)),
          ]);
          const bootstrapped = await useAppStore.getState().bootstrap();
          if (!bootstrapped) return;
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
          cloudSyncService.stop();
          useAppStore.getState().resetSession();
          set({ error: messageForError(error), status: 'signedOut', user: null });
        }
      });
    } catch (error) {
      set({ error: messageForError(error), status: 'signedOut', user: null });
      return () => undefined;
    }
  },

  async continueOffline() {
    const signedOutStatus = authService.isConfigured ? 'signedOut' : 'disabled';
    set({ error: null, status: 'loading' });
    try {
      const bootstrapped = await useAppStore.getState().bootstrap();
      if (!bootstrapped) return;
      set({ offlineMode: true, status: signedOutStatus });
    } catch (error) {
      useAppStore.getState().resetSession();
      set({ error: messageForError(error), offlineMode: false, status: signedOutStatus });
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
      set({ error: messageForError(error), status: 'signedOut' });
    }
  },

  async signInWithEmail(email, password) {
    set({ error: null, status: 'loading' });
    try {
      await authService.signInWithEmail(email, password);
    } catch (error) {
      set({ error: messageForError(error), status: 'signedOut' });
    }
  },

  async createAccount(email, password) {
    set({ error: null, status: 'loading' });
    try {
      await authService.createAccount(email, password);
    } catch (error) {
      set({ error: messageForError(error), status: 'signedOut' });
    }
  },

  async signOut() {
    set({ error: null, offlineMode: false, status: 'loading' });
    try {
      await authService.signOut();
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
      set({ error: messageForError(error), status: 'signedIn' });
    }
  },

  async syncNow() {
    const success = await cloudSyncService.sync(false);
    if (success) {
      await useAppStore.getState().bootstrap();
    }
  },

  clearError() {
    set({ error: null });
  },
}));
