import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { CheckCircle2, Cloud, LogOut } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { authColors, colors } from '../../theme';

export function SettingsScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const bootstrap = useAppStore(state => state.bootstrap);
  const authError = useAuthStore(state => state.error);
  const authStatus = useAuthStore(state => state.status);
  const authUser = useAuthStore(state => state.user);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);

  useFocusEffect(useCallback(() => {
    settingsRepo.getAll().then(settings => { setName(settings.landlordName ?? ''); setPhone(settings.landlordPhone ?? ''); });
  }, []));

  const save = async () => {
    if (!name.trim()) return Alert.alert('Landlord name is required');
    await settingsRepo.setMany({ currency: 'INR', landlordName: name.trim(), landlordPhone: phone.trim() });
    await bootstrap();
    Alert.alert('Settings saved');
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your rent records will remain on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <Card style={styles.cloudCard}>
        <View style={styles.cloudHeader}>
          <View style={styles.cloudIcon}><Cloud color={authColors.primary} size={22} /></View>
          <View style={styles.cloudText}>
            <Body style={styles.cloudTitle}>Cloud account</Body>
            <Muted>
              {authStatus === 'signedIn'
                ? authUser?.email ?? authUser?.displayName ?? 'Google account connected'
                : authStatus === 'disabled'
                  ? 'Firebase configuration required'
                  : 'Not connected'}
            </Muted>
          </View>
        </View>
        {authError ? <Body style={styles.error}>{authError}</Body> : null}
        {authStatus === 'signedIn' ? (
          <>
            <View style={styles.accountRow}>
              {authUser?.photoURL ? (
                <Image source={{ uri: authUser.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}><CheckCircle2 color={authColors.primary} size={20} /></View>
              )}
              <View style={styles.accountDetails}>
                {authUser?.displayName ? <Body style={styles.accountName}>{authUser.displayName}</Body> : null}
                {authUser?.email ? <Muted>{authUser.email}</Muted> : null}
              </View>
            </View>
            <AppButton
              icon={<LogOut color={authColors.primary} size={18} />}
              title="Sign out"
              variant="secondary"
              onPress={confirmSignOut}
            />
          </>
        ) : authStatus === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={authColors.primary} />
            <Muted>Connecting...</Muted>
          </View>
        ) : authStatus === 'disabled' ? (
          <Muted>Google sign-in is unavailable in this build.</Muted>
        ) : (
          <GoogleSigninButton
            color={GoogleSigninButton.Color.Light}
            onPress={signInWithGoogle}
            size={GoogleSigninButton.Size.Wide}
            style={styles.googleButton}
          />
        )}
      </Card>
      <AppInput label="Landlord name" value={name} onChangeText={setName} />
      <AppInput label="Phone number (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <AppInput label="Currency" editable={false} value="INR" />
      <AppButton title="Save settings" onPress={save} />
      <Muted>Rent records remain available offline on this device.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountDetails: { flex: 1 },
  accountName: { fontWeight: '700' },
  accountRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { borderRadius: 22, height: 44, width: 44 },
  avatarFallback: { alignItems: 'center', backgroundColor: authColors.primarySoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  cloudCard: { marginTop: 4 },
  cloudHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  cloudIcon: {
    alignItems: 'center',
    backgroundColor: authColors.primarySoft,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cloudText: { flex: 1 },
  cloudTitle: { fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  googleButton: { alignSelf: 'stretch', height: 48, width: '100%' },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 48 },
});
