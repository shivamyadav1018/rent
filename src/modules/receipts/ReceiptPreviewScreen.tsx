import { useFocusedResource } from '../../hooks/useFocusedResource';
import { ResourceState } from '../../components/ResourceState';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { receiptPdfService } from '../../services/receiptPdfService';
import { PaymentMode } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';
import { fontFamily } from '../../theme';

type ReceiptData = { amountPaid: number; paymentDate: string; paymentMode: PaymentMode; referenceNo?: string; notes?: string };

export function ReceiptPreviewScreen({ route }: any) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const params = route.params;
  const resource = useFocusedResource(useCallback(async () => {
    const [cycle, payment, settings] = await Promise.all([
      rentRepo.findLedgerItem(params.cycleId), paymentRepo.latestForCycle(params.cycleId), settingsRepo.getAll(),
    ]);
    if (!cycle) throw new Error('Rent cycle not found.');
    const data: ReceiptData | null = params.amountPaid || payment ? {
      amountPaid: params.amountPaid ?? payment?.amount ?? 0,
      notes: params.notes ?? payment?.notes ?? undefined,
      paymentDate: params.paymentDate ?? payment?.payment_date ?? new Date().toISOString(),
      paymentMode: params.paymentMode ?? payment?.payment_mode ?? 'cash',
      referenceNo: params.referenceNo ?? payment?.reference_no ?? undefined,
    } : null;
    return { cycle, data, landlordName: settings.landlordName ?? 'Landlord' };
  }, [params]));
  const { cycle, data, landlordName } = resource.data ?? {};
  useEffect(() => { setFilePath(null); }, [resource.data]);

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
    try {
      const path = filePath ?? await buildAndGenerate();
      if (path) await receiptPdfService.share(path);
    } catch (error) {
      Alert.alert('Could not share receipt', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (resource.loading || !cycle) return <ResourceState loading={resource.loading} error={resource.error} label="receipt" retry={resource.retry} />;
  if (!data) return <Screen><Title>Receipt preview</Title><Muted>No payment exists for this rent cycle yet.</Muted></Screen>;
  return (
    <Screen>
      <Title>Receipt preview</Title>
      <Card>
        <Body style={styles.heading}>{cycle.tenant_name}</Body>
        <Muted>KirayaBahi payment receipt</Muted>
        <Muted>Date: {displayDate(data.paymentDate)}</Muted>
        <Body>Landlord: {landlordName}</Body>
        <Body>Property / Unit: {cycle.property_name} / {cycle.unit_name}</Body>
        <Body>Rent month: {monthLabel(cycle.month, cycle.year)}</Body>
        <Body>Rent: {formatCurrency(cycle.rent_amount)}</Body>
        <Body>Electricity: {formatCurrency(cycle.electricity_amount)}</Body>
        <Body>Total payable: {formatCurrency(cycle.total_payable)}</Body>
        <Body>Amount paid: {formatCurrency(data.amountPaid)}</Body>
        <Body>Balance: {formatCurrency(Math.max(cycle.balance, 0))}</Body>
        <Body>Payment mode: {data.paymentMode.replace('_', ' ')}</Body>
        <Muted>Reference: {data.referenceNo || '-'}</Muted>
        <Muted>Notes: {data.notes || '-'}</Muted>
      </Card>
      {filePath ? <Muted>Saved locally: {filePath}</Muted> : null}
      <AppButton disabled={working} title={working ? 'Generating...' : 'Generate PDF'} onPress={buildAndGenerate} />
      <AppButton disabled={working} title="Share PDF" variant="secondary" onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({ heading: { fontFamily, fontSize: 18, fontWeight: '700' } });
