import React, { useCallback, useRef, useState } from 'react';
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
import { pushNotificationService } from '../../services/pushNotificationService';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { authColors, colors } from '../../theme';

export function SettingsScreen() {
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderWorking, setReminderWorking] = useState(false);
  const bootstrap = useAppStore(state => state.bootstrap);
  const authError = useAuthStore(state => state.error);
  const authStatus = useAuthStore(state => state.status);
  const authUser = useAuthStore(state => state.user);
  const syncError = useAuthStore(state => state.syncError);
  const syncLastCompletedAt = useAuthStore(state => state.syncLastCompletedAt);
  const syncPendingCount = useAuthStore(state => state.syncPendingCount);
  const syncStatus = useAuthStore(state => state.syncStatus);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);
  const syncNow = useAuthStore(state => state.syncNow);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    settingsRepo.getAll().then(settings => {
      if (!isActive) return;
      setName(settings.landlordName ?? '');
      setPhone(settings.landlordPhone ?? '');
      setRemindersEnabled(settings.remindersEnabled === 'true');
    }).catch(() => { if (isActive) Alert.alert('Could not load settings', 'Reopen Settings to retry.'); });
    return () => { isActive = false; };
  }, []));

  const save = async () => {
    if (savingRef.current) return;
    if (!name.trim()) return Alert.alert('Landlord name is required');
    savingRef.current = true;
    setSaving(true);
    try {
      await settingsRepo.setMany({ currency: 'INR', landlordName: name.trim(), landlordPhone: phone.trim() });
      await bootstrap().catch(() => undefined);
      Alert.alert('Settings saved', authStatus === 'signedIn' ? 'Changes are queued for cloud sync.' : undefined);
    } catch (error) {
      Alert.alert('Could not save settings', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will return to the sign-in screen. Synced rent records remain available in your cloud account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const toggleReminders = async () => {
    if (reminderWorking) return;
    if (!remindersEnabled && (!authUser || authStatus !== 'signedIn')) {
      return Alert.alert('Cloud account required', 'Connect your Firebase account before enabling scheduled reminders.');
    }
    setReminderWorking(true);
    try {
      if (remindersEnabled) {
        await pushNotificationService.disable();
        setRemindersEnabled(false);
      } else if (authUser) {
        await pushNotificationService.enable(authUser.uid);
        setRemindersEnabled(true);
      }
    } catch (error) {
      Alert.alert('Could not update reminders', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setReminderWorking(false);
    }
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
            <View style={styles.syncRow}>
              <AppIcon
                color={syncStatus === 'error' ? colors.danger : authColors.primary}
                name={syncStatus === 'error' ? 'cloud-alert-outline' : 'cloud-check-outline'}
                size={20}
              />
              <View style={styles.accountDetails}>
                <Body style={styles.syncLabel}>
                  {syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'error'
                      ? 'Sync needs attention'
                      : syncPendingCount > 0
                        ? `${syncPendingCount} change${syncPendingCount === 1 ? '' : 's'} pending`
                        : 'Cloud data is up to date'}
                </Body>
                {syncLastCompletedAt ? (
                  <Muted>Last synced {new Date(syncLastCompletedAt).toLocaleString()}</Muted>
                ) : null}
                {syncError ? <Muted style={styles.error}>{syncError}</Muted> : null}
              </View>
            </View>
            <AppButton
              disabled={syncStatus === 'syncing'}
              icon={<AppIcon color={authColors.primary} name="sync" size={19} />}
              title={syncStatus === 'syncing' ? 'Syncing...' : 'Sync now'}
              variant="secondary"
              onPress={syncNow}
            />
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
      <Card>
        <View style={styles.cloudHeader}>
          <View style={styles.cloudIcon}><AppIcon color={authColors.primary} name="bell-ring-outline" size={23} /></View>
          <View style={styles.cloudText}>
            <Body style={styles.cloudTitle}>Scheduled rent reminders</Body>
            <Muted>{remindersEnabled ? 'Enabled on this device' : 'Get owner alerts before, on, and after each due date'}</Muted>
          </View>
        </View>
        <Muted>Alerts name the tenant, room, and remaining balance so you know whom to follow up with.</Muted>
        <AppButton
          disabled={reminderWorking}
          title={reminderWorking ? 'Updating...' : remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
          variant="secondary"
          onPress={toggleReminders}
        />
      </Card>
      <AppInput label="Landlord name" value={name} onChangeText={setName} />
      <AppInput label="Phone number (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <AppInput label="Currency" editable={false} value="INR" />
      <AppButton disabled={saving} title={saving ? 'Saving...' : 'Save settings'} onPress={save} />
      <Muted>Rent records remain available offline and sync to Firebase when your cloud account is connected.</Muted>
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
  syncLabel: { fontSize: 14, fontWeight: '600' },
  syncRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
