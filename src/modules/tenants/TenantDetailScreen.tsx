import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { Payment, RentCycle, Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';

type TenantDetail = Tenant & { unit_name: string; property_name: string };
type HistoryPayment = Payment & { month: number; year: number };

export function TenantDetailScreen({ navigation, route }: any) {
  const tenantId = route.params.tenantId as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [payments, setPayments] = useState<HistoryPayment[]>([]);

  useFocusEffect(useCallback(() => {
    tenantRepo.find(tenantId).then(async nextTenant => {
      setTenant(nextTenant);
      // Only ensure/create a cycle for active tenants
      const cyclePromise = nextTenant?.status === 'active'
        ? rentCycleService.ensureCurrentCycleForTenant(tenantId)
        : rentCycleService.ensureCycleForTenant(tenantId,
            new Date().getMonth() + 1, new Date().getFullYear())
            .catch(() => null); // Don't crash if no cycle exists
      const [nextCycle, nextPayments] = await Promise.all([cyclePromise, paymentRepo.forTenant(tenantId)]);
      setCycle(nextCycle); setPayments(nextPayments);
    });
  }, [tenantId]));

  if (!tenant) return <Screen><Muted>Loading tenant...</Muted></Screen>;
  return (
    <Screen>
      <Title>{tenant.name}</Title>
      <Muted>{tenant.property_name} / {tenant.unit_name}</Muted>
      {tenant.status === 'inactive' ? <StatusBadge status="vacant" /> : null}
      <Card>
        <Body>{tenant.phone}</Body>
        <Body>{formatCurrency(tenant.monthly_rent)} monthly, due day {tenant.due_day}</Body>
        <Muted>Moved in {displayDate(tenant.move_in_date)} | Deposit {formatCurrency(tenant.security_deposit)}</Muted>
        {tenant.notes ? <Muted>{tenant.notes}</Muted> : null}
      </Card>
      <View style={styles.actions}>
        {tenant.status === 'active' ? (
          <AppButton title="Record payment" onPress={() => navigation.navigate('RecordPayment', { tenantId, cycleId: cycle?.id })} />
        ) : null}
        {tenant.status === 'active' && cycle ? (
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
                      await tenantRepo.deactivate(tenantId);
                      navigation.goBack();
                    },
                  },
                ],
              )
            }
          />
        ) : null}
      </View>
      <Body style={styles.heading}>Current rent</Body>
      {cycle ? <Card><Body>{formatCurrency(cycle.total_paid)} paid of {formatCurrency(cycle.rent_amount)}</Body><Body>{formatCurrency(cycle.balance)} balance</Body><StatusBadge status={cycle.status} /></Card> : <Muted>No cycle available.</Muted>}
      <Body style={styles.heading}>Payment history</Body>
      {payments.length === 0 ? <Muted>No payments recorded.</Muted> : payments.map(payment => <Card key={payment.id}><Body>{formatCurrency(payment.amount)}</Body><Muted>{monthLabel(payment.month, payment.year)} | {displayDate(payment.payment_date)} | {payment.payment_mode.replace('_', ' ')}</Muted></Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontWeight: '800', marginTop: 4 } });
