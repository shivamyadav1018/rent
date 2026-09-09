import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme';
import { FormStep, InfoNote } from '../../components/FormSection';
import { initials } from '../../components/BrandHeader';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  landlordName: z.string().min(2, 'Enter landlord name'),
  landlordPhone: z.string().optional(),
});

export function LandlordSetupScreen() {
  const user = useAuthStore(state => state.user);
  const [saving, setSaving] = useState(false);
  const [landlordName, setLandlordName] = useState(user?.displayName ?? '');
  const [landlordPhone, setLandlordPhone] = useState('');
  const bootstrap = useAppStore(state => state.bootstrap);

  const save = async () => {
    const parsed = schema.safeParse({ landlordName, landlordPhone });
    if (!parsed.success) {
      Alert.alert('Check details', parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await settingsRepo.setMany({
        currency: 'INR',
        landlordName,
        landlordPhone,
        onboardingDone: 'true',
      });
      await bootstrap();
    } catch (error) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <FormStep
        title="Step 2 of 2: Landlord Details"
        detail="Final Step"
        complete
      />
      <Muted>
        Set up your landlord profile to personalize receipts and WhatsApp
        reminders.
      </Muted>
      <View style={styles.profile}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photo}>
            <Body style={styles.initials}>{initials(landlordName)}</Body>
          </View>
        )}
        <Muted style={styles.caption}>
          {landlordName || 'Your landlord profile'}
        </Muted>
      </View>
      <AppInput
        icon="account-outline"
        label="Full Name *"
        placeholder="e.g. Rahul Sharma"
        value={landlordName}
        onChangeText={setLandlordName}
      />
      <AppInput
        icon="phone-outline"
        keyboardType="phone-pad"
        label="WhatsApp Mobile Number (optional)"
        placeholder="e.g. +91 98765 43210"
        value={landlordPhone}
        onChangeText={setLandlordPhone}
      />
      <AppInput
        icon="currency-inr"
        editable={false}
        label="Ledger Currency"
        value="INR (₹ - Indian Rupee)"
      />
      <InfoNote>
        These details will appear on tenant PDF receipts and WhatsApp payment
        reminder messages.
      </InfoNote>
      <AppButton
        icon={<AppIcon color={colors.surface} name="arrow-right" size={20} />}
        title={saving ? 'Saving…' : 'Save and continue'}
        disabled={saving}
        onPress={save}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  profile: { alignItems: 'center', paddingVertical: 12, gap: 10 },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
  },
  initials: {
    color: colors.primaryDark,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
  },
  caption: { fontSize: 11 },
});
