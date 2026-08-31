import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ArrowRight, UserRound } from 'lucide-react-native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme';

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
    <Screen>
      <View style={styles.intro}>
        <View style={styles.icon}><UserRound color={colors.primary} size={24} /></View>
        <View style={styles.introText}><Title style={styles.title}>Your details</Title><Muted>These details appear on reminders and receipts.</Muted></View>
      </View>
      <AppInput label="Landlord name" value={landlordName} onChangeText={setLandlordName} />
      <AppInput keyboardType="phone-pad" label="Phone number optional" value={landlordPhone} onChangeText={setLandlordPhone} />
      <AppInput editable={false} label="Default currency" value="INR" />
      <Body style={styles.privacy}>Stored privately on this device</Body>
      <AppButton icon={<ArrowRight color={colors.surface} size={18} />} title="Save and continue" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 48, justifyContent: 'center', width: 48 },
  intro: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 10 },
  introText: { flex: 1, gap: 2 },
  privacy: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  title: { fontSize: 23, lineHeight: 29 },
});
