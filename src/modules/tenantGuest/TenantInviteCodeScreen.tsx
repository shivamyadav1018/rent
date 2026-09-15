import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantApplicationService } from '../../services/tenantApplicationService';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

export function TenantInviteCodeScreen({ navigation }: any) {
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) return;
    tenantApplicationService.mine(user.uid)
      .then(applications => {
        if (active && applications[0]) navigation.replace('TenantSubmission', { applicationId: applications[0].id });
      })
      .catch(() => undefined)
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [navigation, user]);

  const continueWithCode = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const invite = await tenantApplicationService.lookupInvite(code);
      navigation.navigate('TenantApplication', { code: invite.code });
    } catch (error) {
      Alert.alert('Could not use invite', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.logo}><AppIcon color={colors.surface} name="home-city-outline" size={34} /></View>
        <Body style={styles.brandName}>KirayaBahi</Body>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><AppIcon color={colors.primaryDark} name="account-key-outline" size={30} /></View>
        <Title>Join your rental</Title>
        <Muted style={styles.center}>Enter the code shared by your property owner. No email, password or OTP is needed.</Muted>
      </View>
      <View style={styles.form}>
        <AppInput
          autoCapitalize="characters"
          autoCorrect={false}
          label="Invite code"
          maxLength={6}
          placeholder="ABC123"
          value={code}
          onChangeText={value => setCode(tenantApplicationService.normaliseCode(value))}
        />
        <AppButton
          disabled={checking || restoring || code.length !== 6}
          icon={<AppIcon color={colors.surface} name="arrow-right" size={19} />}
          title={restoring ? 'Checking previous request...' : checking ? 'Checking code...' : 'Continue'}
          onPress={continueWithCode}
        />
      </View>
      <InfoNote title="Your privacy">
        Your details go only to the owner who created this code. Your mobile number will be marked unverified until the owner confirms it with you.
      </InfoNote>
      {restoring ? <ActivityIndicator color={colors.primary} /> : null}
      <AppButton title="Back to owner sign in" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandName: { fontSize: 20, fontWeight: '800' },
  center: { maxWidth: 340, textAlign: 'center' },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: 14, padding: 18 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 64, justifyContent: 'center', width: 64 },
  logo: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  screen: { flexGrow: 1, justifyContent: 'center' },
});
