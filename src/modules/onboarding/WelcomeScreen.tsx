import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight, BookOpenCheck } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { Body, Title } from '../../components/Typography';
import { colors } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  return (
    <Screen style={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.mark}><BookOpenCheck color={colors.surface} size={30} strokeWidth={2.2} /></View>
        <Title style={styles.title}>Rent Khata</Title>
        <Body style={styles.subtitle}>Your simple, private rent book.</Body>
      </View>
      <View style={styles.footer}>
        <AppButton icon={<ArrowRight color={colors.surface} size={18} />} title="Get started" onPress={() => navigation.navigate('LandlordSetup')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  footer: { paddingBottom: 12 },
  mark: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, height: 64, justifyContent: 'center', marginBottom: 22, width: 64 },
  screen: { flexGrow: 1 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 8, textAlign: 'center' },
  title: { fontSize: 34, lineHeight: 40 },
});
