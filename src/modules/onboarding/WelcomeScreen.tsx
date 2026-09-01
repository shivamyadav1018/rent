import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { ArrowRight, BookOpenCheck, CheckCircle2, LogOut, WifiOff } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const error = useAuthStore(state => state.error);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
  const continueToSetup = () => navigation.navigate('LandlordSetup');

  return (
    <Screen style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}><BookOpenCheck color={colors.surface} size={30} strokeWidth={2.2} /></View>
        <Title style={styles.title}>KirayaBahi</Title>
        <Body style={styles.subtitle}>Your simple, private rent book.</Body>
      </View>
      <View style={styles.footer}>
        {error ? <Body style={styles.error}>{error}</Body> : null}
        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Muted>Checking your account...</Muted>
          </View>
        ) : status === 'signedIn' ? (
          <>
            <View style={styles.account}>
              <CheckCircle2 color={colors.primary} size={22} />
              <View style={styles.accountText}>
                <Body style={styles.accountName}>{user?.displayName ?? 'Google account connected'}</Body>
                {user?.email ? <Muted>{user.email}</Muted> : null}
              </View>
            </View>
            <AppButton icon={<ArrowRight color={colors.surface} size={18} />} title="Continue" onPress={continueToSetup} />
            <AppButton icon={<LogOut color={colors.primaryDark} size={18} />} title="Use another account" variant="secondary" onPress={signOut} />
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
            <AppButton icon={<WifiOff color={colors.primaryDark} size={18} />} title="Continue offline" variant="secondary" onPress={continueToSetup} />
          </>
        )}
        <Muted style={styles.privacy}>Your rent records remain available on this device.</Muted>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, flexDirection: 'row', gap: 12, minHeight: 64, padding: 14 },
  accountName: { fontWeight: '700' },
  accountText: { flex: 1 },
  brand: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 260 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 8, color: colors.danger, fontSize: 13, padding: 12 },
  footer: { gap: 10, paddingBottom: 12 },
  googleButton: { alignSelf: 'stretch', height: 48, width: '100%' },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 48 },
  mark: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, height: 64, justifyContent: 'center', marginBottom: 22, width: 64 },
  offlineNote: { textAlign: 'center' },
  privacy: { marginTop: 2, textAlign: 'center' },
  screen: { flexGrow: 1 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 8, textAlign: 'center' },
  title: { fontSize: 34, lineHeight: 40 },
});
