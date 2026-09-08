import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

export const messageForAuthError = (error: unknown) => {
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
  return 'Unable to connect your account. Please try again.';
};

