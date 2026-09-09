import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { idProofService } from '../../services/idProofService';
import { Payment, RentCycle, Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';

type TenantDetail = Tenant & { unit_name: string; property_name: string };
type HistoryPayment = Payment & { month: number; year: number };

export function TenantDetailScreen({ navigation, route }: any) {
  const tenantId = route.params.tenantId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [payments, setPayments] = useState<HistoryPayment[]>([]);
  const [electricityDraft, setElectricityDraft] = useState('0');
  const [savingBill, setSavingBill] = useState(false);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const nextTenant = await tenantRepo.find(tenantId);
        if (!isActive) return;
        setTenant(nextTenant);
        const now = new Date();
        // Inactive tenants may have an existing final cycle, but must never get
        // a new rent cycle simply because their details screen was opened.
        const cyclePromise = nextTenant?.status === 'active'
          ? rentCycleService.ensureCurrentCycleForTenant(tenantId)
          : rentRepo.findCycle(tenantId, now.getMonth() + 1, now.getFullYear());
        const [nextCycle, nextPayments] = await Promise.all([cyclePromise, paymentRepo.forTenant(tenantId)]);
        if (!isActive) return;
        setCycle(nextCycle?.deleted_at ? null : nextCycle);
        if (nextCycle && !nextCycle.deleted_at) setElectricityDraft(String(nextCycle.electricity_amount ?? 0));
        setPayments(nextPayments);
      } catch {
        if (!isActive) return;
        setCycle(null);
        setPayments([]);
        setError('Could not load tenant details. Reopen this tenant to retry.');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    load();
    return () => { isActive = false; };
  }, [tenantId]));

  if (loading) return <Screen><Muted>Loading tenant...</Muted></Screen>;
  if (error || !tenant) return <Screen><Muted>{error || 'Tenant not found.'}</Muted><AppButton title="Go back" onPress={() => navigation.goBack()} /></Screen>;
  const updateElectricity = async () => {
    if (!cycle || savingBill) return;
    const amount = Number(electricityDraft);
    if (!Number.isFinite(amount) || amount < 0) return Alert.alert('Check electricity', 'Enter an amount of zero or more.');
    setSavingBill(true);
    try {
      const updated = await rentCycleService.updateElectricity(tenantId, cycle.month, cycle.year, amount);
      setCycle(updated);
      Alert.alert('Bill updated', `Total payable is now ${formatCurrency(updated.total_payable)}.`);
    } catch (updateError) {
      Alert.alert('Could not update bill', updateError instanceof Error ? updateError.message : 'Please try again.');
    } finally {
      setSavingBill(false);
    }
  };
  return (
    <Screen>
      <Title>{tenant.name}</Title>
      <Muted>{tenant.property_name} / {tenant.unit_name}</Muted>
      {tenant.status === 'inactive' ? <Muted>Moved out</Muted> : null}
      <Card>
        <Body>{tenant.phone}</Body>
        <Body>Rent {formatCurrency(tenant.monthly_rent)} + Electricity {formatCurrency(tenant.electricity_amount)}</Body>
        <Body>Total {formatCurrency(tenant.monthly_rent + tenant.electricity_amount)}, due day {tenant.due_day}</Body>
        <Muted>Moved in {displayDate(tenant.move_in_date)} | Deposit {formatCurrency(tenant.security_deposit)}</Muted>
        {tenant.id_proof_storage_path ? (
          <AppButton
            title={`View ID proof${tenant.id_proof_name ? ` · ${tenant.id_proof_name}` : ''}`}
            variant="secondary"
            onPress={() => idProofService.open(tenant.id_proof_storage_path as string).catch(() => Alert.alert('Could not open ID proof', 'Check your connection and Firebase Storage access.'))}
          />
        ) : null}
        {tenant.notes ? <Muted>{tenant.notes}</Muted> : null}
      </Card>
      <View style={styles.actions}>
        {tenant.status === 'active' ? (
          <AppButton title="Record payment" onPress={() => navigation.navigate('RecordPayment', { tenantId, cycleId: cycle?.id })} />
        ) : null}
        {tenant.status === 'active' && cycle && cycle.balance > 0 ? (
          <AppButton title="Send reminder" variant="secondary" onPress={() => navigation.navigate('ReminderPreview', { cycleId: cycle.id })} />
        ) : null}
        <AppButton title="Edit tenant" variant="secondary" onPress={() => navigation.navigate('AddTenant', { tenantId })} />
        {tenant.status === 'active' ? (
          <AppButton
            title="Move out"
            variant="danger"
            onPress={() =>
              Alert.alert(
                'Mark as moved out?',
                `This will mark ${tenant.name} as inactive and free their unit. This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Move out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await tenantRepo.deactivate(tenantId);
                        navigation.goBack();
                      } catch {
                        Alert.alert('Could not move out tenant', 'Please try again.');
                      }
                    },
                  },
                ],
              )
            }
          />
        ) : null}
      </View>
      <Body style={styles.heading}>Current rent</Body>
      {cycle ? <Card><Body>Rent {formatCurrency(cycle.rent_amount)} + Electricity {formatCurrency(cycle.electricity_amount)}</Body><Body style={styles.total}>Total payable {formatCurrency(cycle.total_payable)}</Body><Body>{formatCurrency(cycle.total_paid)} paid · {formatCurrency(cycle.balance)} remaining</Body><StatusBadge status={cycle.status} />{tenant.status === 'active' ? <><AppInput editable={!savingBill} label="Electricity for this month" keyboardType="numeric" value={electricityDraft} onChangeText={setElectricityDraft} /><AppButton disabled={savingBill} title={savingBill ? 'Updating...' : 'Update electricity'} variant="secondary" onPress={updateElectricity} /></> : null}</Card> : <Muted>No cycle available.</Muted>}
      <Body style={styles.heading}>Payment history</Body>
      {payments.length === 0 ? <Muted>No payments recorded.</Muted> : payments.map(payment => <Card key={payment.id}><Body>{formatCurrency(payment.amount)}</Body><Muted>{monthLabel(payment.month, payment.year)} | {displayDate(payment.payment_date)} | {payment.payment_mode.replace('_', ' ')}</Muted></Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontWeight: '800', marginTop: 4 }, total: { fontWeight: '800' } });
