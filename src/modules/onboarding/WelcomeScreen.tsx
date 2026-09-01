import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { ArrowRight, BookOpenCheck, CheckCircle2, LogOut, WifiOff } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { useAuthStore } from '../../store/authStore';
import { authColors, authShadow, colors, fontFamily, radius } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const error = useAuthStore(state => state.error);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
  const continueToSetup = () => navigation.navigate('LandlordSetup');

  return (
    <Screen backgroundColor={authColors.background} style={styles.screen}>

      {/* ── Brand section ── */}
      <View style={styles.brandSection}>
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <BookOpenCheck color={authColors.primary} size={30} strokeWidth={2.2} />
          </View>
        </View>
        <Title style={styles.brandName}>KirayaBahi</Title>
        <Muted style={styles.tagline}>Smart rent management for landlords</Muted>
      </View>

      {/* ── Login card ── */}
      <View style={styles.card}>
        <Title style={styles.heading}>
          {status === 'signedIn' ? 'Account connected' : 'Sign in to your account'}
        </Title>
        <Muted style={styles.subtitle}>
          {status === 'signedIn'
            ? 'Continue with your connected Google account.'
            : 'Use your Google account to continue to KirayaBahi.'}
        </Muted>

        {error ? <Body style={styles.error}>{error}</Body> : null}

        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={authColors.primary} size="small" />
            <Muted style={styles.loadingText}>Checking your account…</Muted>
          </View>
        ) : status === 'signedIn' ? (
          <>
            <View style={styles.account}>
              <View style={styles.accountAvatar}>
                <CheckCircle2 color={authColors.primary} size={20} />
              </View>
              <View style={styles.accountText}>
                <Body style={styles.accountName}>{user?.displayName ?? 'Google account connected'}</Body>
                {user?.email ? <Muted style={styles.accountEmail}>{user.email}</Muted> : null}
              </View>
            </View>
            <AppButton
              icon={<ArrowRight color={authColors.background} size={18} />}
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
              <View style={styles.disabledWrap}>
                <Muted style={styles.offlineNote}>Google sign-in is unavailable in this build.</Muted>
              </View>
            ) : (
              <GoogleSigninButton
                color={GoogleSigninButton.Color.Light}
                onPress={signInWithGoogle}
                size={GoogleSigninButton.Size.Wide}
                style={styles.googleButton}
              />
            )}

            {/* Divider */}
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
  account: {
    alignItems: 'center',
    backgroundColor: authColors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  accountAvatar: {
    alignItems: 'center',
    backgroundColor: authColors.background,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  accountEmail: { color: authColors.muted, fontSize: 12, marginTop: 1 },
  accountName: { color: authColors.ink, fontWeight: '700' },
  accountText: { flex: 1 },
  brandName: {
    color: authColors.primaryDark,
    fontFamily,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 14,
  },
  brandSection: { alignItems: 'center', paddingTop: 48 },
  card: {
    ...authShadow,
    backgroundColor: authColors.background,
    borderColor: authColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 14,
    marginTop: 36,
    padding: 24,
  },
  disabledWrap: { alignItems: 'center', paddingVertical: 8 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dividerLine: { backgroundColor: authColors.border, flex: 1, height: 1 },
  dividerText: { color: authColors.muted, fontSize: 12 },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    color: colors.danger,
    fontSize: 13,
    padding: 12,
  },
  googleButton: { alignSelf: 'stretch', height: 50, width: '100%' },
  heading: { color: authColors.ink, fontSize: 21, lineHeight: 27 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 6 },
  loadingText: { color: authColors.muted },
  logoMark: {
    alignItems: 'center',
    backgroundColor: authColors.primarySoft,
    borderRadius: radius.lg,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  logoWrap: {
    ...authShadow,
    borderRadius: radius.lg,
  },
  offlineNote: { color: authColors.muted, textAlign: 'center' },
  outlineButton: {
    backgroundColor: authColors.background,
    borderColor: authColors.primary,
    borderWidth: 1.5,
  },
  outlineButtonText: { color: authColors.primary },
  primaryButton: { backgroundColor: authColors.primary },
  privacy: { color: authColors.muted, marginTop: 'auto', paddingTop: 32, paddingBottom: 8, textAlign: 'center' },
  screen: { flexGrow: 1, paddingHorizontal: 24 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 21 },
  tagline: { color: authColors.muted, fontSize: 14, marginTop: 6 },
});
