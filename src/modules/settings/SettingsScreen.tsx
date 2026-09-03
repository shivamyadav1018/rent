import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from 'react-native-elements';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
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
    Alert.alert('Sign out?', 'You will return to the sign-in screen. Your rent records will remain stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <Card style={styles.cloudCard}>
        <View style={styles.cloudHeader}>
          <View style={styles.cloudIcon}><AppIcon color={authColors.primary} name="cloud-outline" size={23} /></View>
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
              <Avatar
                icon={authUser?.photoURL ? undefined : { color: authColors.primary, name: 'check-circle-outline', type: 'material-community' }}
                overlayContainerStyle={styles.avatarFallback}
                rounded
                size={44}
                source={authUser?.photoURL ? { uri: authUser.photoURL } : undefined}
              />
              <View style={styles.accountDetails}>
                {authUser?.displayName ? <Body style={styles.accountName}>{authUser.displayName}</Body> : null}
                {authUser?.email ? <Muted>{authUser.email}</Muted> : null}
              </View>
            </View>
            <AppButton
              icon={<AppIcon color={authColors.primary} name="logout" size={19} />}
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
          <AppButton
            icon={<AppIcon color="#4285F4" name="google" size={19} />}
            onPress={signInWithGoogle}
            title="Connect with Google"
            variant="secondary"
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
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 48 },
});
