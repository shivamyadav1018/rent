import React from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { Screen } from '../../components/Screen';
import { Body, Title } from '../../components/Typography';

export function WelcomeScreen({ navigation }: any) {
  return (
    <Screen style={styles.screen}>
      <Title>Rent Khata</Title>
      <Body>Track tenants, rent due, payments, reminders, and receipts offline.</Body>
      <AppButton title="Get Started" onPress={() => navigation.navigate('LandlordSetup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center' },
});
