import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { rentRepo } from '../../database/repositories/rentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { whatsappShareService } from '../../services/whatsappShareService';
import { LedgerItem } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';

const createMessage = (cycle: LedgerItem, landlordName: string) => cycle.status === 'overdue'
  ? `Hello ${cycle.tenant_name}, your rent of ${formatCurrency(cycle.balance)} for ${monthLabel(cycle.month, cycle.year)} was due on ${displayDate(cycle.due_date)}. Please clear it soon.\n\n- ${landlordName}`
  : `Hello ${cycle.tenant_name}, your rent of ${formatCurrency(cycle.balance)} for ${monthLabel(cycle.month, cycle.year)} is pending. Please pay when possible.\n\n- ${landlordName}`;

export function ReminderPreviewScreen({ route }: any) {
  const [cycle, setCycle] = useState<LedgerItem | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;
    Promise.all([rentRepo.findLedgerItem(route.params.cycleId), settingsRepo.getAll()]).then(([nextCycle, settings]) => {
      if (!isActive) return;
      setCycle(nextCycle);
      if (nextCycle) setMessage(createMessage(nextCycle, settings.landlordName ?? 'Landlord'));
    }).catch(() => {
      if (isActive) setCycle(null);
    });
    return () => { isActive = false; };
  }, [route.params.cycleId]);

  if (!cycle) return <Screen><Muted>Loading reminder...</Muted></Screen>;
  return (
    <Screen>
      <Title>Reminder preview</Title>
      <Card><Body>{cycle.tenant_name}</Body><Muted>{cycle.property_name} / {cycle.unit_name} | {formatCurrency(cycle.balance)} pending</Muted></Card>
      <AppInput label="Message" multiline numberOfLines={8} value={message} onChangeText={setMessage} />
      <AppButton title="Send on WhatsApp" onPress={() => whatsappShareService.shareMessage(cycle.tenant_phone, message)} />
      <AppButton title="Copy message" variant="secondary" onPress={() => { Clipboard.setString(message); Alert.alert('Copied', 'Reminder copied to clipboard.'); }} />
    </Screen>
  );
}
