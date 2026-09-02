import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { rentRepo } from '../../database/repositories/rentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { PaymentMode, RentCycle, Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { currentMonthYear, monthLabel } from '../../utils/dates';

const modes: PaymentMode[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];
const paymentSchema = z.coerce.number().positive('Amount must be greater than zero');

export function RecordPaymentScreen({ navigation, route }: any) {
  const current = currentMonthYear();
  const refreshAll = useAppStore(state => state.refreshAll);
  const [activeTenants, setActiveTenants] = useState<(Tenant & { unit_name?: string })[]>([]);
  const [tenantId, setTenantId] = useState(route.params?.tenantId ?? '');
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCycleId, setSavedCycleId] = useState<string | null>(null);

  // Load only active tenants for the selector
  useEffect(() => { tenantRepo.active().then(setActiveTenants); }, []);

  useEffect(() => {
    const cycleId = route.params?.cycleId as string | undefined;
    if (!cycleId) return;
    rentRepo.findLedgerItem(cycleId).then(item => {
      if (!item) return;
      setCycle(item); setTenantId(item.tenant_id); setMonth(item.month); setYear(item.year); setAmount(String(Math.max(item.balance, 0)));
    });
  }, [route.params?.cycleId]);

  useEffect(() => {
    if (!tenantId || route.params?.cycleId) return;
    rentCycleService.ensureCycleForTenant(tenantId, month, year).then(next => {
      setCycle(next); if (next) setAmount(String(Math.max(next.balance, 0)));
    });
  }, [month, route.params?.cycleId, tenantId, year]);

  const changeMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1); setMonth(next.getMonth() + 1); setYear(next.getFullYear()); setCycle(null);
  };

  const save = async () => {
    const parsedAmount = paymentSchema.safeParse(amount);
    if (!tenantId) return Alert.alert('Select a tenant');
    if (!parsedAmount.success) return Alert.alert('Check amount', parsedAmount.error.issues[0]?.message);
    setSaving(true);
    try {
      // paymentDate stored as plain YYYY-MM-DD (no UTC conversion) consistent with dates.ts fix
      const updated = await rentCycleService.recordPayment({ amount: parsedAmount.data, month, notes, paymentDate, paymentMode: mode, referenceNo, tenantId, year });
      await refreshAll();
      if (updated) { setCycle(updated); setSavedCycleId(updated.id); }
    } catch (error) {
      Alert.alert('Could not record payment', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  if (savedCycleId) return (
    <Screen>
      <Title>Payment saved</Title>
      <Card><Body>{formatCurrency(Number(amount))} recorded</Body><Muted>{monthLabel(month, year)} | {mode.replace('_', ' ')}</Muted></Card>
      <AppButton title="Generate / share receipt" onPress={() => navigation.navigate('ReceiptPreview', { amountPaid: Number(amount), cycleId: savedCycleId, notes, paymentDate, paymentMode: mode, referenceNo })} />
      <AppButton title="Back to dashboard" variant="secondary" onPress={() => navigation.navigate('MainTabs')} />
    </Screen>
  );

  return (
    <Screen>
      <Title>Record payment</Title>
      <Body style={styles.label}>Tenant</Body>
      <View style={styles.options}>{activeTenants.map(tenant => <AppChip key={tenant.id} label={tenant.name} selected={tenantId === tenant.id} onPress={() => setTenantId(tenant.id)} />)}</View>
      <View style={styles.monthRow}><AppButton title="Previous" variant="secondary" onPress={() => changeMonth(-1)} /><Body style={styles.month}>{monthLabel(month, year)}</Body><AppButton title="Next" variant="secondary" onPress={() => changeMonth(1)} /></View>
      {cycle ? <Muted>Rent {formatCurrency(cycle.rent_amount)} | Current balance {formatCurrency(cycle.balance)}</Muted> : null}
      <AppInput label="Amount received" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <AppInput label="Payment date (YYYY-MM-DD)" value={paymentDate} onChangeText={setPaymentDate} />
      <Body style={styles.label}>Payment mode</Body>
      <View style={styles.options}>{modes.map(item => <AppChip key={item} label={item.replace('_', ' ')} selected={mode === item} onPress={() => setMode(item)} />)}</View>
      <AppInput label="Reference number (optional)" value={referenceNo} onChangeText={setReferenceNo} />
      <AppInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <AppButton title={saving ? 'Saving...' : 'Save payment'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({ label: { fontSize: 13, fontWeight: '600' }, month: { flex: 1, fontWeight: '700', textAlign: 'center' }, monthRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
