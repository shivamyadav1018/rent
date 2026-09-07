import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { MonthSelector } from '../../components/MonthSelector';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { rentRepo } from '../../database/repositories/rentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { colors, radius } from '../../theme';
import { PaymentMode, RentCycle, Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { currentMonthYear, monthLabel, todayDate, isValidDate } from '../../utils/dates';

const modes: PaymentMode[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];
const paymentSchema = z.coerce.number().positive('Amount must be greater than zero');

export function RecordPaymentScreen({ navigation, route }: any) {
  const current = currentMonthYear();
  const refreshAll = useAppStore(state => state.refreshAll);
  const [activeTenants, setActiveTenants] = useState<(Tenant & { unit_name?: string; property_name?: string })[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantId, setTenantId] = useState(route.params?.tenantId ?? '');
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayDate());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selectionReady, setSelectionReady] = useState(!route.params?.cycleId);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cycleError, setCycleError] = useState('');
  const [savedCycleId, setSavedCycleId] = useState<string | null>(null);

  // Refresh after returning from the tenant form so newly created tenants appear immediately.
  useFocusEffect(useCallback(() => {
    let isActive = true;
    setLoadingTenants(true);
    tenantRepo.list('', Boolean(route.params?.cycleId))
      .then(tenants => { if (isActive) setActiveTenants(tenants); })
      .catch(() => { if (isActive) setActiveTenants([]); })
      .finally(() => { if (isActive) setLoadingTenants(false); });
    return () => { isActive = false; };
  }, [route.params?.cycleId]));

  useEffect(() => {
    const cycleId = route.params?.cycleId as string | undefined;
    if (!cycleId) return;
    let isActive = true;
    rentRepo.findLedgerItem(cycleId).then(item => {
      if (!isActive) return;
      if (!item) throw new Error('Rent cycle not found');
      setTenantId(item.tenant_id); setMonth(item.month); setYear(item.year);
      setSelectionReady(true);
    }).catch(error => { if (isActive) setCycleError(error instanceof Error ? error.message : 'Could not load rent cycle'); });
    return () => { isActive = false; };
  }, [route.params?.cycleId]);

  useEffect(() => {
    if (!tenantId || !selectionReady) return;
    setCycle(null);
    setAmount('');
    setCycleError('');
    setLoadingCycle(true);
    let isActive = true;
    rentCycleService.ensureCycleForTenant(tenantId, month, year).then(next => {
      if (!isActive) return;
      setCycle(next);
      if (next) setAmount(String(Math.max(next.balance, 0)));
      else setCycleError('No rent cycle is available for this month.');
    }).catch(() => {
      if (isActive) setCycleError('Could not load the rent balance. Please retry.');
    }).finally(() => { if (isActive) setLoadingCycle(false); });
    return () => { isActive = false; };
  }, [month, retryCount, selectionReady, tenantId, year]);

  const changeMonth = (delta: number) => {
    if (savingRef.current || !selectionReady) return;
    setAmount('');
    const next = new Date(year, month - 1 + delta, 1); setMonth(next.getMonth() + 1); setYear(next.getFullYear()); setCycle(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    const parsedAmount = paymentSchema.safeParse(amount);
    if (!tenantId) return Alert.alert('Select a tenant');
    if (!parsedAmount.success) return Alert.alert('Check amount', parsedAmount.error.issues[0]?.message);
    if (!isValidDate(paymentDate)) return Alert.alert('Check date', 'Enter a valid payment date (YYYY-MM-DD)');
    if (!cycle || loadingCycle) return Alert.alert('Wait for the rent balance to load');
    savingRef.current = true;
    setSaving(true);
    try {
      // paymentDate stored as plain YYYY-MM-DD (no UTC conversion) consistent with dates.ts fix
      const updated = await rentCycleService.recordPayment({ amount: parsedAmount.data, month, notes, paymentDate, paymentMode: mode, referenceNo, tenantId, year });
      if (updated) { setCycle(updated); setSavedCycleId(updated.id); }
      refreshAll().catch(() => undefined);
    } catch (error) {
      Alert.alert('Could not record payment', error instanceof Error ? error.message : 'Please try again.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  if (savedCycleId) return (
    <Screen>
      <Title>Payment saved</Title>
      <Card><Body>{formatCurrency(Number(amount))} recorded</Body><Muted>{monthLabel(month, year)} | {mode.replace('_', ' ')}</Muted></Card>
      <AppButton title="Generate / share receipt" onPress={() => navigation.navigate('ReceiptPreview', { amountPaid: Number(amount), cycleId: savedCycleId, notes, paymentDate, paymentMode: mode, referenceNo })} />
      <AppButton title="Back to dashboard" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })} />
    </Screen>
  );

  return (
    <Screen>
      <Title>Record payment</Title>
      <Body style={styles.label}>Tenant</Body>
      {loadingTenants && activeTenants.length === 0 ? (
        <View style={styles.loadingTenants}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Muted>Loading active tenants...</Muted>
        </View>
      ) : activeTenants.length > 0 ? (
        <View style={styles.tenantOptions}>
          {activeTenants.map(tenant => {
            const selected = tenantId === tenant.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={tenant.id}
                onPress={() => { if (savingRef.current || !selectionReady || tenantId === tenant.id) return; setTenantId(tenant.id); setCycle(null); setAmount(''); }}
                style={({ pressed }) => [styles.tenantOption, selected && styles.tenantOptionSelected, pressed && styles.optionPressed]}>
                <View style={[styles.tenantIcon, selected && styles.tenantIconSelected]}>
                  <AppIcon color={selected ? colors.surface : colors.primary} name="account-outline" size={21} />
                </View>
                <View style={styles.tenantInfo}>
                  <Body numberOfLines={1} style={styles.tenantName}>{tenant.name}</Body>
                  <Muted numberOfLines={1}>
                    {[tenant.property_name, tenant.unit_name].filter(Boolean).join(' / ') || tenant.phone}
                  </Muted>
                </View>
                <AppIcon
                  color={selected ? colors.primary : colors.muted}
                  name={selected ? 'check-circle' : 'circle-outline'}
                  size={22}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyTenants}>
          <View style={styles.emptyTenantIcon}>
            <AppIcon color={colors.primary} name="account-plus-outline" size={24} />
          </View>
          <Body style={styles.emptyTenantTitle}>No active tenants</Body>
          <Muted style={styles.emptyTenantMessage}>Add a tenant before recording a payment.</Muted>
          <AppButton title="Add tenant" variant="secondary" onPress={() => navigation.navigate('AddTenant')} />
        </View>
      )}
      <MonthSelector month={month} year={year} onChange={changeMonth} disabled={saving || !selectionReady} />
      {loadingCycle ? <Muted>Loading rent balance...</Muted> : null}
      {cycleError ? <View><Muted>{cycleError}</Muted><AppButton title="Retry" variant="secondary" onPress={() => { if (selectionReady) setRetryCount(count => count + 1); else navigation.replace('RecordPayment', route.params); }} /></View> : null}
      {cycle ? <Muted>Rent {formatCurrency(cycle.rent_amount)} | Current balance {formatCurrency(cycle.balance)}</Muted> : null}
      <AppInput editable={!saving} label="Amount received" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <AppInput editable={!saving} label="Payment date (YYYY-MM-DD)" value={paymentDate} onChangeText={setPaymentDate} />
      <Body style={styles.label}>Payment mode</Body>
      <View style={styles.options}>{modes.map(item => <AppChip key={item} label={item.replace('_', ' ')} selected={mode === item} onPress={() => { if (!savingRef.current) setMode(item); }} />)}</View>
      <AppInput editable={!saving} label="Reference number (optional)" value={referenceNo} onChangeText={setReferenceNo} />
      <AppInput editable={!saving} label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <AppButton disabled={saving || loadingCycle || !cycle || !selectionReady} title={saving ? 'Saving...' : 'Save payment'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTenantIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyTenantMessage: { textAlign: 'center' },
  emptyTenantTitle: { fontWeight: '700', marginTop: 2 },
  emptyTenants: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  label: { fontSize: 13, fontWeight: '600' },
  loadingTenants: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  optionPressed: { opacity: 0.75 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenantIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tenantIconSelected: { backgroundColor: colors.primary },
  tenantInfo: { flex: 1 },
  tenantName: { fontWeight: '700' },
  tenantOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  tenantOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
    padding: 11,
  },
  tenantOptions: { gap: 8 },
});
