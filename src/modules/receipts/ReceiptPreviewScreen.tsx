import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { receiptPdfService } from '../../services/receiptPdfService';
import { LedgerItem, PaymentMode } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';
import { fontFamily } from '../../theme';

type ReceiptData = { amountPaid: number; paymentDate: string; paymentMode: PaymentMode; referenceNo?: string; notes?: string };

export function ReceiptPreviewScreen({ route }: any) {
  const [cycle, setCycle] = useState<LedgerItem | null>(null);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [landlordName, setLandlordName] = useState('Landlord');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    Promise.all([rentRepo.findLedgerItem(route.params.cycleId), paymentRepo.latestForCycle(route.params.cycleId), settingsRepo.getAll()]).then(([nextCycle, payment, settings]) => {
      setCycle(nextCycle); setLandlordName(settings.landlordName ?? 'Landlord');
      const paymentMode = route.params.paymentMode as PaymentMode | undefined;
      if (route.params.amountPaid || payment) setData({ amountPaid: route.params.amountPaid ?? payment?.amount ?? 0, notes: route.params.notes ?? payment?.notes ?? undefined, paymentDate: route.params.paymentDate ?? payment?.payment_date ?? new Date().toISOString(), paymentMode: paymentMode ?? payment?.payment_mode ?? 'cash', referenceNo: route.params.referenceNo ?? payment?.reference_no ?? undefined });
    });
  }, [route.params]);

  const buildAndGenerate = async () => {
    if (!cycle || !data) return undefined;
    setWorking(true);
    try {
      const html = await receiptPdfService.buildHtml({ cycle, ...data });
      const path = await receiptPdfService.generate(html);
      if (path) { setFilePath(path); await settingsRepo.set(`receipt:${cycle.id}`, path); Alert.alert('PDF generated', path); }
      return path;
    } catch (error) {
      Alert.alert('Could not generate receipt', error instanceof Error ? error.message : 'Please try again.');
    } finally { setWorking(false); }
  };

  const share = async () => {
    const path = filePath ?? await buildAndGenerate();
    if (path) await receiptPdfService.share(path);
  };

  if (!cycle) return <Screen><Muted>Loading receipt...</Muted></Screen>;
  if (!data) return <Screen><Title>Receipt preview</Title><Muted>No payment exists for this rent cycle yet.</Muted></Screen>;
  return (
    <Screen>
      <Title>Receipt preview</Title>
      <Card>
        <Body style={styles.heading}>Rent Khata Receipt</Body>
        <Muted>Date: {displayDate(data.paymentDate)}</Muted>
        <Body>Landlord: {landlordName}</Body>
        <Body>Tenant: {cycle.tenant_name}</Body>
        <Body>Property / Unit: {cycle.property_name} / {cycle.unit_name}</Body>
        <Body>Rent month: {monthLabel(cycle.month, cycle.year)}</Body>
        <Body>Amount paid: {formatCurrency(data.amountPaid)}</Body>
        <Body>Balance: {formatCurrency(Math.max(cycle.balance, 0))}</Body>
        <Body>Payment mode: {data.paymentMode.replace('_', ' ')}</Body>
        <Muted>Reference: {data.referenceNo || '-'}</Muted>
        <Muted>Notes: {data.notes || '-'}</Muted>
      </Card>
      {filePath ? <Muted>Saved locally: {filePath}</Muted> : null}
      <AppButton title={working ? 'Generating...' : 'Generate PDF'} onPress={buildAndGenerate} />
      <AppButton title="Share PDF" variant="secondary" onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({ heading: { fontFamily, fontSize: 18, fontWeight: '700' } });
