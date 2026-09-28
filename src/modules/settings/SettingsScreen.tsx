import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { exportService } from '../../services/exportService';
import { i18n, Locale } from '../../utils/i18n';
import { useAppStore } from '../../store/appStore';
import { colors, fontFamily } from '../../theme';

export function SettingsScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [language, setLanguage] = useState<Locale>('en');
  const [exportingCsv, setExportingCsv] = useState(false);
  const bootstrap = useAppStore(state => state.bootstrap);

  useFocusEffect(useCallback(() => {
    settingsRepo.getAll().then(settings => {
      setName(settings.landlordName ?? '');
      setPhone(settings.landlordPhone ?? '');
      setUpiVpa(settings.upiVpa ?? '');
      setLanguage(settings.language === 'hi' ? 'hi' : 'en');
    });
  }, []));

  const save = async () => {
    if (!name.trim()) return Alert.alert('Landlord name is required');
    await settingsRepo.setMany({ currency: 'INR', landlordName: name.trim(), landlordPhone: phone.trim() });
    if (upiVpa.trim()) await settingsRepo.setUpiVpa(upiVpa.trim());
    await bootstrap();
    Alert.alert('Settings saved');
  };

  const changeLanguage = async (locale: Locale) => {
    setLanguage(locale);
    i18n.setLocale(locale);
    await settingsRepo.setLanguage(locale);
  };

  const exportCsv = async () => {
    const year = new Date().getFullYear();
    setExportingCsv(true);
    try {
      await exportService.exportPaymentsCsv(year);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <AppInput label="Landlord name" value={name} onChangeText={setName} />
      <AppInput label="Phone number (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <AppInput label="Currency" editable={false} value="INR" />
      <AppInput label="UPI VPA (optional, e.g. yourname@upi)" value={upiVpa} onChangeText={setUpiVpa} />

      <Body style={styles.label}>Language / भाषा</Body>
      <View style={styles.langRow}>
        <Pressable onPress={() => changeLanguage('en')} style={[styles.langBtn, language === 'en' && styles.langBtnSelected]}>
          <Body style={[styles.langText, language === 'en' && styles.langTextSelected]}>English</Body>
        </Pressable>
        <Pressable onPress={() => changeLanguage('hi')} style={[styles.langBtn, language === 'hi' && styles.langBtnSelected]}>
          <Body style={[styles.langText, language === 'hi' && styles.langTextSelected]}>हिंदी</Body>
        </Pressable>
      </View>

      <AppButton title="Save settings" onPress={save} />
      <AppButton
        title={exportingCsv ? 'Exporting...' : 'Export Payments CSV'}
        variant="secondary"
        onPress={exportCsv}
      />
      <AppButton
        title="Annual Report"
        variant="secondary"
        onPress={() => navigation.navigate('AnnualReport')}
      />
      <Muted>All app data remains on this device.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600', marginTop: 4 },
  langRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  langBtn: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 8, padding: 12, alignItems: 'center' },
  langBtnSelected: { backgroundColor: colors.primary },
  langText: { fontFamily, color: colors.ink },
  langTextSelected: { color: colors.surface, fontWeight: '700' },
});
