import { create } from 'zustand';

import { syncRepo } from '../database/repositories/syncRepo';
import { authService } from '../services/authService';

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
  error: string | null;
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const messageForError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to connect your Google account. Please try again.';
};

export const useAuthStore = create<AuthState>((set) => ({
  error: null,
  status: authService.isConfigured ? 'loading' : 'disabled',
  user: null,

  initialize() {
    if (!authService.isConfigured) {
      set({ status: 'disabled', user: null });
      return () => undefined;
    }

    set({ status: 'loading' });
    return authService.subscribe(async firebaseUser => {
      if (!firebaseUser) {
        set({ status: 'signedOut', user: null });
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
        set({
          error: null,
          status: 'signedIn',
          user: {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            uid: firebaseUser.uid,
          },
        });
      } catch (error) {
        set({ error: messageForError(error), status: 'signedOut', user: null });
      }
    });
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

  async signOut() {
    set({ error: null, status: 'loading' });
    try {
      await authService.signOut();
    } catch (error) {
      set({ error: messageForError(error), status: 'signedIn' });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
