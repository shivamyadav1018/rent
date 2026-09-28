import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppDatePicker } from '../../components/AppDatePicker';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { MonthSelector } from '../../components/MonthSelector';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
<<<<<<< HEAD
import { colors, radius } from '../../theme';
=======
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { PaymentMode, RentCycle } from '../../types/models';
>>>>>>> feature/improvements-16
import { formatCurrency } from '../../utils/currency';
import { monthLabel } from '../../utils/dates';

import { paymentModes, useRecordPayment } from './useRecordPayment';

export function RecordPaymentScreen({ navigation, route }: any) {
<<<<<<< HEAD
  const {
    activeTenants, loadingTenants, tenantError, retryTenants, tenantId, selectTenant,
    cycle, month, year, changeMonth, amount, setAmount, electricityAmount, setElectricityAmount, paymentDate, setPaymentDate,
    mode, selectMode, referenceNo, setReferenceNo, notes, setNotes, saving,
    selectionReady, loadingCycle, cycleError, retryCycle, savedCycleId, savedPaymentId, save,
  } = useRecordPayment(route.params);
=======
  const current = currentMonthYear();
  const tenants = useAppStore(state => state.tenants);
  const refreshAll = useAppStore(state => state.refreshAll);
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
      const updated = await rentCycleService.recordPayment({ amount: parsedAmount.data, month, notes, paymentDate: new Date(`${paymentDate}T12:00:00`).toISOString(), paymentMode: mode, referenceNo, tenantId, year });
      await refreshAll();
      if (updated) { setCycle(updated); setSavedCycleId(updated.id); }
      // Improvement 13: in-app review after 3rd payment
      try {
        const countRows = await paymentRepo.count();
        const count = countRows[0]?.count ?? 0;
        const prompted = await settingsRepo.get('reviewPrompted');
        if (count >= 3 && prompted !== 'true') {
          await settingsRepo.set('reviewPrompted', 'true');
          try {
            const InAppReview = require('react-native-in-app-review');
            if (InAppReview.isAvailable()) {
              InAppReview.RequestInAppReview();
            }
          } catch { /* package not installed */ }
        }
      } catch { /* non-critical */ }
    } catch (error) {
      Alert.alert('Could not record payment', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };
>>>>>>> feature/improvements-16

  if (savedCycleId) return (
    <Screen>
      <Title>Payment saved</Title>
      <Card><Body>{formatCurrency(Number(amount))} recorded</Body><Muted>{monthLabel(month, year)} | {mode.replace('_', ' ')}</Muted></Card>
      <AppButton title="Generate / share receipt" onPress={() => navigation.navigate('ReceiptPreview', { cycleId: savedCycleId, paymentId: savedPaymentId })} />
      <AppButton title="Back to dashboard" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })} />
    </Screen>
  );

  return (
    <Screen>
      <Title>Record payment</Title>
      <Body style={styles.label}>Tenant</Body>
      {tenantError ? <View><Muted>{tenantError}</Muted><AppButton title="Retry tenants" onPress={retryTenants} /></View> : null}
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
                onPress={() => selectTenant(tenant.id)}
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
      ) : !tenantError ? (
        <View style={styles.emptyTenants}>
          <View style={styles.emptyTenantIcon}>
            <AppIcon color={colors.primary} name="account-plus-outline" size={24} />
          </View>
          <Body style={styles.emptyTenantTitle}>No active tenants</Body>
          <Muted style={styles.emptyTenantMessage}>Add a tenant before recording a payment.</Muted>
          <AppButton title="Add tenant" variant="secondary" onPress={() => navigation.navigate('AddTenant')} />
        </View>
      ) : null}
      <MonthSelector month={month} year={year} onChange={changeMonth} disabled={saving || !selectionReady} />
      {loadingCycle ? <Muted>Loading rent balance...</Muted> : null}
      {cycleError ? <View><Muted>{cycleError}</Muted><AppButton title="Retry" variant="secondary" onPress={retryCycle} /></View> : null}
      {cycle ? (
        <Card>
          <Body>{`Rent ${formatCurrency(cycle.rent_amount)} + Electricity ${formatCurrency(Number(electricityAmount) || 0)}`}</Body>
          <Body style={styles.payable}>{`Total payable ${formatCurrency(cycle.rent_amount + (Number(electricityAmount) || 0))}`}</Body>
          <Muted>Already paid {formatCurrency(cycle.total_paid)} | Balance after bill update {formatCurrency(cycle.rent_amount + (Number(electricityAmount) || 0) - cycle.total_paid)}</Muted>
        </Card>
      ) : null}
      <AppInput editable={!saving} label="Electricity for this month" keyboardType="numeric" value={electricityAmount} onChangeText={setElectricityAmount} />
      <AppInput editable={!saving} label="Amount received" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <AppDatePicker
        label="Payment date"
        maximumDate={new Date()}
        value={paymentDate}
        onChange={setPaymentDate}
      />
      <Body style={styles.label}>Payment mode</Body>
      <View style={styles.options}>{paymentModes.map(item => <AppChip key={item} label={item.replace('_', ' ')} selected={mode === item} onPress={() => selectMode(item)} />)}</View>
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
  payable: { fontWeight: '800' },
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
