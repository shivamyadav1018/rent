import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Muted, Title } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useAppStore } from '../../store/appStore';

export function SettingsScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const bootstrap = useAppStore(state => state.bootstrap);

  useFocusEffect(useCallback(() => {
    settingsRepo.getAll().then(settings => { setName(settings.landlordName ?? ''); setPhone(settings.landlordPhone ?? ''); });
  }, []));

  const save = async () => {
    if (!name.trim()) return Alert.alert('Landlord name is required');
    await settingsRepo.setMany({ currency: 'INR', landlordName: name.trim(), landlordPhone: phone.trim() });
    await bootstrap();
    Alert.alert('Settings saved');
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <AppInput label="Landlord name" value={name} onChangeText={setName} />
      <AppInput label="Phone number (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <AppInput label="Currency" editable={false} value="INR" />
      <AppButton title="Save settings" onPress={save} />
      <Muted>All app data remains on this device.</Muted>
    </Screen>
  );
}
