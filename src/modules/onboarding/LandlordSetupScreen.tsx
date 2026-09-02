import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';
import { authColors, authShadow, fontFamily, radius } from '../../theme';

const schema = z.object({
  landlordName: z.string().min(2, 'Enter landlord name'),
  landlordPhone: z.string().optional(),
});

export function LandlordSetupScreen({ navigation }: any) {
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const bootstrap = useAppStore(state => state.bootstrap);

  const save = async () => {
    const parsed = schema.safeParse({ landlordName, landlordPhone });
    if (!parsed.success) {
      Alert.alert('Check details', parsed.error.issues[0]?.message);
      return;
    }
    await settingsRepo.setMany({
      currency: 'INR',
      landlordName,
      landlordPhone,
      onboardingDone: 'true',
    });
    await bootstrap();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <Screen backgroundColor={authColors.background} style={styles.screen}>

      {/* ── Step indicator ── */}
      <View style={styles.steps}>
        <View style={styles.stepDone} />
        <View style={styles.stepActive} />
      </View>
      <Muted style={styles.stepLabel}>Step 2 of 2 — Profile setup</Muted>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <AppIcon color={authColors.primary} name="account-outline" size={28} />
        </View>
        <Title style={styles.title}>Your details</Title>
        <Muted style={styles.subtitle}>
          These details appear on rent reminders and receipts sent to tenants.
        </Muted>
      </View>

      {/* ── Form card ── */}
      <View style={styles.card}>
        <AppInput
          variant="auth"
          label="Landlord name"
          placeholder="e.g. Rahul Sharma"
          value={landlordName}
          onChangeText={setLandlordName}
        />
        <AppInput
          variant="auth"
          keyboardType="phone-pad"
          label="Phone number (optional)"
          placeholder="e.g. 9876543210"
          value={landlordPhone}
          onChangeText={setLandlordPhone}
        />
        <AppInput
          variant="auth"
          editable={false}
          label="Default currency"
          value="INR — Indian Rupee"
        />
      </View>

      <View style={styles.privacyRow}>
        <AppIcon color={authColors.muted} name="lock-outline" size={15} />
        <Body style={styles.privacy}>Stored privately on this device only</Body>
      </View>

      <AppButton
        icon={<AppIcon color={authColors.background} name="arrow-right" size={19} />}
        title="Save and continue"
        onPress={save}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: authColors.primary, marginTop: 4 },
  card: {
    ...authShadow,
    backgroundColor: authColors.background,
    borderColor: authColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  header: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: authColors.primarySoft,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  privacy: {
    color: authColors.muted,
    fontFamily,
    fontSize: 12,
  },
  privacyRow: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center' },
  screen: { flexGrow: 1, gap: 20, paddingHorizontal: 24 },
  stepActive: {
    backgroundColor: authColors.primary,
    borderRadius: 4,
    flex: 1,
    height: 5,
  },
  stepDone: {
    backgroundColor: authColors.primarySoft,
    borderRadius: 4,
    flex: 1,
    height: 5,
  },
  stepLabel: { color: authColors.muted, fontSize: 12, textAlign: 'center', marginTop: -12 },
  steps: { flexDirection: 'row', gap: 6, marginTop: 8 },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  title: { color: authColors.ink, fontSize: 24, fontWeight: '800', lineHeight: 30, marginTop: 4 },
});
