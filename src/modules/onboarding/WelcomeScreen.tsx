import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { ArrowRight, BookOpenCheck, CheckCircle2, LogOut, WifiOff } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { useAuthStore } from '../../store/authStore';
import { authColors, colors } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const error = useAuthStore(state => state.error);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
  const continueToSetup = () => navigation.navigate('LandlordSetup');

  return (
    <Screen backgroundColor={authColors.background} style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}><BookOpenCheck color={authColors.primary} size={27} strokeWidth={2.2} /></View>
        <Title style={styles.brandName}>KirayaBahi</Title>
      </View>
      <View style={styles.login}>
        <Title style={styles.heading}>{status === 'signedIn' ? 'Account connected' : 'Sign in to your account'}</Title>
        <Muted style={styles.subtitle}>
          {status === 'signedIn'
            ? 'Continue with your connected Google account.'
            : 'Use your Google account to continue to KirayaBahi.'}
        </Muted>
        {error ? <Body style={styles.error}>{error}</Body> : null}
        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={authColors.primary} />
            <Muted>Checking your account...</Muted>
          </View>
        ) : status === 'signedIn' ? (
          <>
            <View style={styles.account}>
              <CheckCircle2 color={authColors.primary} size={22} />
              <View style={styles.accountText}>
                <Body style={styles.accountName}>{user?.displayName ?? 'Google account connected'}</Body>
                {user?.email ? <Muted>{user.email}</Muted> : null}
              </View>
            </View>
            <AppButton
              icon={<ArrowRight color={colors.surface} size={18} />}
              title="Continue"
              onPress={continueToSetup}
              style={styles.primaryButton}
            />
            <AppButton
              icon={<LogOut color={authColors.primary} size={18} />}
              title="Use another account"
              variant="secondary"
              onPress={signOut}
              style={styles.outlineButton}
              textStyle={styles.outlineButtonText}
            />
          </>
        ) : (
          <>
            {status === 'disabled' ? (
              <Muted style={styles.offlineNote}>Google sign-in is unavailable in this build.</Muted>
            ) : (
              <GoogleSigninButton
                color={GoogleSigninButton.Color.Light}
                onPress={signInWithGoogle}
                size={GoogleSigninButton.Size.Wide}
                style={styles.googleButton}
              />
            )}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Muted style={styles.dividerText}>or</Muted>
              <View style={styles.dividerLine} />
            </View>
            <AppButton
              icon={<WifiOff color={authColors.primary} size={18} />}
              title="Continue offline"
              variant="secondary"
              onPress={continueToSetup}
              style={styles.outlineButton}
              textStyle={styles.outlineButtonText}
            />
          </>
        )}
      </View>
      <Muted style={styles.privacy}>Your rent records remain available on this device.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { alignItems: 'center', backgroundColor: authColors.primarySoft, borderRadius: 8, flexDirection: 'row', gap: 12, minHeight: 64, padding: 14 },
  accountName: { fontWeight: '700' },
  accountText: { flex: 1 },
  brand: { alignItems: 'center', gap: 10, marginTop: 38 },
  brandName: { color: authColors.primaryDark, fontSize: 25, lineHeight: 30 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 2 },
  dividerLine: { backgroundColor: authColors.border, flex: 1, height: 1 },
  dividerText: { color: authColors.muted },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 8, color: colors.danger, fontSize: 13, padding: 12 },
  googleButton: { alignSelf: 'stretch', height: 48, width: '100%' },
  heading: { color: authColors.ink, fontSize: 22, lineHeight: 28 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52 },
  login: { gap: 14, marginTop: 58 },
  mark: { alignItems: 'center', backgroundColor: authColors.primarySoft, borderRadius: 8, height: 54, justifyContent: 'center', width: 54 },
  offlineNote: { textAlign: 'center' },
  outlineButton: { backgroundColor: authColors.background, borderColor: authColors.primary, borderWidth: 1 },
  outlineButtonText: { color: authColors.primary },
  primaryButton: { backgroundColor: authColors.primary },
  privacy: { color: authColors.muted, marginTop: 'auto', paddingTop: 48, textAlign: 'center' },
  screen: { flexGrow: 1, paddingHorizontal: 28 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
