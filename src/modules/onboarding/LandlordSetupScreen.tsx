import React, { useState } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';

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
      <AppInput label="Landlord name" value={landlordName} onChangeText={setLandlordName} />
      <AppInput keyboardType="phone-pad" label="Phone number optional" value={landlordPhone} onChangeText={setLandlordPhone} />
      <AppInput editable={false} label="Default currency" value="INR" />
      <AppButton title="Save and Continue" onPress={save} />
    </Screen>
  );
}
