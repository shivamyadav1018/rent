import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { colors } from '../../theme';

type TenantDetail = Tenant & { unit_name: string; property_name: string };
type HistoryPayment = Payment & { month: number; year: number };

const getLeaseWarning = (leaseEnd?: string | null): { message: string; expired: boolean } | null => {
  if (!leaseEnd) return null;
  const end = new Date(leaseEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { message: `Lease expired on ${leaseEnd.slice(0, 10)}. Update or renew.`, expired: true };
  if (diffDays <= 30) return { message: `Lease expires on ${leaseEnd.slice(0, 10)}. Renew the agreement.`, expired: false };
  return null;
};

export function TenantDetailScreen({ navigation, route }: any) {
  const tenantId = route.params.tenantId as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [payments, setPayments] = useState<HistoryPayment[]>([]);
  const [leaseWarningDismissed, setLeaseWarningDismissed] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([tenantRepo.find(tenantId), rentCycleService.ensureCurrentCycleForTenant(tenantId), paymentRepo.forTenant(tenantId)]).then(([nextTenant, nextCycle, nextPayments]) => {
      setTenant(nextTenant); setCycle(nextCycle); setPayments(nextPayments);
    });
  }, [tenantId]));

  if (!tenant) return <Screen><Muted>Loading tenant...</Muted></Screen>;
  const leaseWarning = getLeaseWarning(tenant.lease_end);
  return (
    <Screen>
      <Title>{tenant.name}</Title>
      <Muted>{tenant.property_name} / {tenant.unit_name}</Muted>
      {leaseWarning && !leaseWarningDismissed ? (
        <View style={[styles.leaseBanner, leaseWarning.expired ? styles.leaseExpired : styles.leaseWarn]}>
          <Body style={styles.leaseBannerText}>{leaseWarning.message}</Body>
          <Pressable onPress={() => setLeaseWarningDismissed(true)} style={styles.dismissBtn}><Muted style={styles.dismissText}>✕</Muted></Pressable>
        </View>
      ) : null}
      <Card>
        <Body>{tenant.phone}</Body>
        <Body>{formatCurrency(tenant.monthly_rent)} monthly, due day {tenant.due_day}</Body>
        <Muted>Moved in {displayDate(tenant.move_in_date)} | Deposit {formatCurrency(tenant.security_deposit)}</Muted>
        {tenant.notes ? <Muted>{tenant.notes}</Muted> : null}
      </Card>
      <View style={styles.actions}>
        <AppButton title="Record payment" onPress={() => navigation.navigate('RecordPayment', { tenantId, cycleId: cycle?.id })} />
        {cycle ? <AppButton title="Send reminder" variant="secondary" onPress={() => navigation.navigate('ReminderPreview', { cycleId: cycle.id })} /> : null}
        <AppButton title="Edit tenant" variant="secondary" onPress={() => navigation.navigate('AddTenant', { tenantId })} />
      </View>
      <Body style={styles.heading}>Current rent</Body>
      {cycle ? <Card><Body>{formatCurrency(cycle.total_paid)} paid of {formatCurrency(cycle.rent_amount)}</Body><Body>{formatCurrency(cycle.balance)} balance</Body><StatusBadge status={cycle.status} /></Card> : <Muted>No cycle available.</Muted>}
      <Body style={styles.heading}>Payment history</Body>
      {payments.length === 0 ? <Muted>No payments recorded.</Muted> : payments.map(payment => <Card key={payment.id}><Body>{formatCurrency(payment.amount)}</Body><Muted>{monthLabel(payment.month, payment.year)} | {displayDate(payment.payment_date)} | {payment.payment_mode.replace('_', ' ')}</Muted></Card>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { fontWeight: '800', marginTop: 4 },
  leaseBanner: { borderRadius: 8, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  leaseWarn: { backgroundColor: colors.warningSoft },
  leaseExpired: { backgroundColor: colors.dangerSoft },
  leaseBannerText: { flex: 1, fontSize: 13 },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: 16 },
});
