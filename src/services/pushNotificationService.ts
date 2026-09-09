import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { deleteDoc, doc, getFirestore, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';

import { settingsRepo } from '../database/repositories/settingsRepo';
import { createId } from '../utils/ids';

let activeOwnerId: string | null = null;
let activeDeviceId: string | null = null;
let unsubscribeMessage: (() => void) | null = null;
let unsubscribeToken: (() => void) | null = null;

const enabledAuthorization = (status: number) =>
  status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;

const notificationPermission = async (shouldRequest: boolean) => {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < 33) return true;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return true;
    if (!shouldRequest) return false;
    return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
  }

  let status = await hasPermission(getMessaging());
  if (status === AuthorizationStatus.NOT_DETERMINED && shouldRequest) {
    status = await requestPermission(getMessaging());
  }
  return enabledAuthorization(status);
};

const deviceId = async () => {
  const existing = await settingsRepo.get('notificationDeviceId');
  if (existing) return existing;
  const id = createId('device');
  await settingsRepo.set('notificationDeviceId', id);
  return id;
};

const saveToken = async (ownerId: string, id: string, token: string) => {
  await setDoc(doc(getFirestore(), 'users', ownerId, 'devices', id), {
    enabled: true,
    platform: Platform.OS,
    token,
    updated_at: serverTimestamp(),
  });
};

const clearListeners = () => {
  unsubscribeMessage?.();
  unsubscribeToken?.();
  unsubscribeMessage = null;
  unsubscribeToken = null;
};

const register = async (ownerId: string, shouldRequestPermission: boolean) => {
  if (!(await notificationPermission(shouldRequestPermission))) return false;
  const id = await deviceId();
  const messaging = getMessaging();
  const token = await getToken(messaging);
  await saveToken(ownerId, id, token);

  clearListeners();
  activeOwnerId = ownerId;
  activeDeviceId = id;
  unsubscribeToken = onTokenRefresh(messaging, nextToken => {
    if (activeOwnerId === ownerId && activeDeviceId === id) {
      saveToken(ownerId, id, nextToken).catch(() => undefined);
    }
  });
  unsubscribeMessage = onMessage(messaging, message => {
    if (message.notification?.title || message.notification?.body) {
      Alert.alert(message.notification.title ?? 'Rent reminder', message.notification.body);
    }
  });
  return true;
};

export const pushNotificationService = {
  async resume(ownerId: string) {
    if (await settingsRepo.get('remindersEnabled') !== 'true') return false;
    return register(ownerId, false);
  },

  async enable(ownerId: string) {
    const registered = await register(ownerId, true);
    if (!registered) throw new Error('Notification permission was not granted. Enable it in your device settings.');
    await settingsRepo.set('remindersEnabled', 'true');
  },

  async disable() {
    await settingsRepo.set('remindersEnabled', 'false');
    const ownerId = activeOwnerId;
    const id = activeDeviceId ?? await settingsRepo.get('notificationDeviceId');
    clearListeners();
    activeOwnerId = null;
    activeDeviceId = null;
    if (ownerId && id) {
      await deleteDoc(doc(getFirestore(), 'users', ownerId, 'devices', id)).catch(() => undefined);
    }
    await deleteToken(getMessaging()).catch(() => undefined);
  },

  async stopForSignOut(ownerId?: string) {
    const id = activeDeviceId ?? await settingsRepo.get('notificationDeviceId');
    clearListeners();
    activeOwnerId = null;
    activeDeviceId = null;
    if (ownerId && id) {
      await deleteDoc(doc(getFirestore(), 'users', ownerId, 'devices', id)).catch(() => undefined);
    }
    await deleteToken(getMessaging()).catch(() => undefined);
  },

  isEnabled() {
    return settingsRepo.get('remindersEnabled').then(value => value === 'true');
  },
};
