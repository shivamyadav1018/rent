import { getApp } from '@react-native-firebase/app';
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';

import { isFirebaseConfigured } from '../config/firebase';

let initialized = false;

export const firebaseService = {
  initialize() {
    if (!isFirebaseConfigured || initialized) {
      return;
    }

    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
      isTokenAutoRefreshEnabled: true,
    });
    initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
    initialized = true;
  },
};
