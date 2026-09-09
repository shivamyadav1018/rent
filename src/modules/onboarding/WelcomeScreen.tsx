import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { useAuthStore } from '../../store/authStore';
import { authColors, authShadow, colors, fontFamily, radius } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  const continueOffline = useAuthStore(state => state.continueOffline);
  const createAccount = useAuthStore(state => state.createAccount);
  const signInWithEmail = useAuthStore(state => state.signInWithEmail);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
  const continueToSetup = async () => {
    if (status !== 'signedIn') {
      await continueOffline();
      return;
    }
    navigation.navigate('LandlordSetup');
  };

  const changeMode = (nextMode: 'signIn' | 'signUp') => {
    setMode(nextMode);
    setFormError(null);
    setPassword('');
    setConfirmPassword('');
    clearError();
  };

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signUp' && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setFormError(null);
    if (mode === 'signUp') {
      await createAccount(cleanEmail, password);
    } else {
      await signInWithEmail(cleanEmail, password);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.readyStrip}><View style={styles.readyDot} /><Muted>Offline-first khata</Muted><AppIcon color={colors.success} name="shield-check-outline" size={19} /></View>
      <View style={styles.brandSection}>
        <View style={styles.logoMark}>
          <AppIcon color={authColors.background} name="home-city-outline" size={40} />
        </View>
        <View style={styles.brandPill}><AppIcon name="office-building-outline" color={colors.primaryDark} size={15} /><Body style={styles.brandPillText}>SMART BAHI-KHATA</Body></View>
        <Title style={styles.brandName}>KirayaBahi</Title>
        <Muted style={styles.tagline}>Smart rent management for landlords</Muted>
      </View>

      <View style={styles.form}>
        <Title style={styles.heading}>
          {status === 'signedIn' ? 'Account connected' : mode === 'signUp' ? 'Create your account' : 'Sign in to your account'}
        </Title>
        <Muted style={styles.subtitle}>
          {status === 'signedIn'
            ? 'Your records can now stay connected to this account.'
            : mode === 'signUp'
              ? 'Create an account to keep your rent records connected.'
              : 'Welcome back. Enter your details to continue.'}
        </Muted>

        {error || formError ? <Body style={styles.error}>{formError ?? error}</Body> : null}

        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={authColors.primary} size="small" />
            <Muted style={styles.loadingText}>Connecting your account…</Muted>
          </View>
        ) : status === 'signedIn' ? (
          <>
            <View style={styles.account}>
              <View style={styles.accountAvatar}>
                <AppIcon color={authColors.primary} name="check-circle-outline" size={22} />
              </View>
              <View style={styles.accountText}>
                <Body style={styles.accountName}>{user?.displayName ?? 'Account connected'}</Body>
                {user?.email ? <Muted style={styles.accountEmail}>{user.email}</Muted> : null}
              </View>
            </View>
            <AppButton icon={<AppIcon color={authColors.background} name="arrow-right" size={19} />} title="Continue" onPress={continueToSetup} />
            <AppButton icon={<AppIcon color={authColors.primary} name="logout" size={19} />} title="Use another account" variant="secondary" onPress={signOut} />
          </>
        ) : (
          <>
            {status !== 'disabled' ? (
              <>
                <AppInput variant="auth" autoCapitalize="none" autoComplete="email" keyboardType="email-address" icon="at" label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} />
                <AppInput variant="auth" autoCapitalize="none" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} icon="lock-outline" label="Password" placeholder="Enter your password" secureTextEntry value={password} onChangeText={setPassword} />
                {mode === 'signUp' ? (
                  <AppInput variant="auth" autoCapitalize="none" autoComplete="new-password" label="Confirm password" placeholder="Re-enter your password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                ) : null}
                <AppButton title={mode === 'signUp' ? 'Create account' : 'Sign in'} onPress={submit} />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Muted style={styles.dividerText}>or continue with</Muted>
                  <View style={styles.dividerLine} />
                </View>
                <AppButton icon={<AppIcon color="#4285F4" name="google" size={19} />} title="Sign in with Google" variant="secondary" onPress={signInWithGoogle} />
              </>
            ) : (
              <Muted style={styles.offlineNote}>Online sign-in is unavailable in this build.</Muted>
            )}

            <View style={styles.modeRow}>
              <Muted>{mode === 'signUp' ? 'Already have an account?' : "Don't have an account?"}</Muted>
              <Pressable onPress={() => changeMode(mode === 'signUp' ? 'signIn' : 'signUp')}>
                <Body style={styles.modeLink}>{mode === 'signUp' ? 'Sign in' : 'Sign up'}</Body>
              </Pressable>
            </View>

          </>
        )}
      </View>

      {status !== 'signedIn' && status !== 'loading' ? <View style={styles.offlineCard}>
        <View style={styles.offlineHeading}><View style={styles.offlineIcon}><AppIcon name="cellphone-wireless" color={colors.success} size={29} /></View><View style={styles.offlineInfo}><Title style={styles.heading}>Continue offline</Title><Muted>No internet required. Keep your rent records on this device.</Muted></View></View>
        <AppButton title="Start Offline  ›" variant="secondary" onPress={continueToSetup} />
      </View> : null}
      <InfoNote>Your data is stored locally on this phone. Sign in to an account to enable cloud backup.</InfoNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readyStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 24, padding: 12 },
  readyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mint },
  brandPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.lavender, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  brandPillText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  offlineCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 20 },
  offlineHeading: { flexDirection: 'row', gap: 12 }, offlineInfo: { flex: 1, gap: 4 },
  offlineIcon: { width: 48, height: 48, backgroundColor: colors.mint, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  account: { alignItems: 'center', backgroundColor: authColors.primarySoft, borderColor: authColors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  accountAvatar: { alignItems: 'center', backgroundColor: authColors.background, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  accountEmail: { color: authColors.muted, fontSize: 12, marginTop: 1 },
  accountName: { color: authColors.ink, fontWeight: '700' },
  accountText: { flex: 1 },
  brandName: { color: authColors.ink, fontFamily, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 12 },
  brandSection: { alignItems: 'center', paddingTop: 18, paddingBottom: 12 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 2 },
  dividerLine: { backgroundColor: authColors.border, flex: 1, height: 1 },
  dividerText: { color: authColors.muted, fontSize: 12 },
  error: { backgroundColor: colors.dangerSoft, borderColor: '#F6C7C1', borderRadius: radius.sm, borderWidth: 1, color: colors.danger, fontSize: 13, padding: 12 },
  form: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: 18, marginTop: 4, padding: 20 },
  heading: { color: authColors.ink, fontSize: 22, lineHeight: 28 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 18 },
  loadingText: { color: authColors.muted },
  logoMark: { ...authShadow, alignItems: 'center', backgroundColor: authColors.primary, borderRadius: radius.lg, height: 88, justifyContent: 'center', width: 88, marginBottom: 14 },
  modeLink: { color: authColors.primary, fontSize: 13, fontWeight: '700' },
  modeRow: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 4 },
  offlineAction: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 6, padding: 6 },
  offlineActionText: { color: authColors.muted, textDecorationLine: 'underline' },
  offlineNote: { color: authColors.muted, paddingVertical: 8, textAlign: 'center' },
  privacy: { color: authColors.muted, marginTop: 'auto', paddingBottom: 8, paddingTop: 24, textAlign: 'center' },
  screen: { flexGrow: 1, paddingHorizontal: 16, gap: 20 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 21, marginBottom: 2 },
  tagline: { color: authColors.muted, fontSize: 14, marginTop: 4 },
});
