// This value is public OAuth configuration, not a client secret.
export const GOOGLE_WEB_CLIENT_ID =
  '188147067656-h7gsmlnsq91erqfifhd4ef81q1aa8le3.apps.googleusercontent.com';

// An OAuth client ID alone does not mean native Firebase is installed (e.g. iOS).
export const isFirebaseConfigured = getApps().some(app => app.name === '[DEFAULT]');
import { getApps } from '@react-native-firebase/app';
