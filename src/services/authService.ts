import { Platform } from 'react-native';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID, isFirebaseConfigured } from '../config/firebase';
import { firebaseService } from './firebaseService';

let configured = false;

const configure = () => {
  if (!isFirebaseConfigured || configured) {
    return;
  }

  firebaseService.initialize();
  GoogleSignin.configure({
    offlineAccess: false,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  configured = true;
};

export const authService = {
  isConfigured: isFirebaseConfigured,

  subscribe(listener: (user: User | null) => void) {
    if (!isFirebaseConfigured) {
      listener(null);
      return () => undefined;
    }

    configure();
    return onAuthStateChanged(getAuth(), listener);
  },

  async signInWithGoogle() {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase configuration is not installed yet.');
    }

    configure();
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      return null;
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token. Check the Web OAuth client ID.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(getAuth(), credential);
  },

  async signOut() {
    if (!isFirebaseConfigured) {
      return;
    }
    await Promise.all([signOut(getAuth()), GoogleSignin.signOut()]);
  },
};
