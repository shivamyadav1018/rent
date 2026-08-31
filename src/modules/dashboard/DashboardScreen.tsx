import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SummaryCard } from '../../components/SummaryCard';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel, currentMonthYear } from '../../utils/dates';

export function DashboardScreen({ navigation }: any) {
  const { month, year } = currentMonthYear();
  const summary = useAppStore(state => state.summary);
  const ledger = useAppStore(state => state.ledger);
  const refreshAll = useAppStore(state => state.refreshAll);

  useFocusEffect(useCallback(() => {
    refreshAll();
  }, [refreshAll]));

  const due = ledger.filter(item => item.status !== 'paid').slice(0, 5);
  const paid = ledger.filter(item => item.status === 'paid').slice(0, 5);

  return (
    <Screen>
      <Title>Rent Khata</Title>
      <Muted>{monthLabel(month, year)}</Muted>
      <View style={styles.summaryRow}>
        <SummaryCard label="Expected" value={formatCurrency(summary.expectedRent)} />
        <SummaryCard label="Collected" value={formatCurrency(summary.collectedRent)} />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard label="Pending" value={formatCurrency(summary.pendingRent)} />
        <SummaryCard label="Overdue" value={String(summary.overdueCount)} />
      </View>
      <View style={styles.actions}>
        <AppButton title="Add Tenant" onPress={() => navigation.navigate('AddTenant')} />
        <AppButton title="Record Payment" onPress={() => navigation.navigate('RecordPayment')} variant="secondary" />
        <AppButton title="View Ledger" onPress={() => navigation.navigate('Ledger')} variant="secondary" />
      </View>
      <Body>Due this month</Body>
      {due.length === 0 ? <Muted>No pending rent for this month.</Muted> : due.map(item => (
        <Card key={item.id}>
          <Body>{item.tenant_name}</Body>
          <Muted>{item.property_name} / {item.unit_name} | Due {displayDate(item.due_date)}</Muted>
          <Body>{formatCurrency(item.balance)} pending</Body>
          <StatusBadge status={item.status} />
          <AppButton title="Send Reminder" onPress={() => navigation.navigate('ReminderPreview', { cycleId: item.id })} variant="secondary" />
        </Card>
      ))}
      <Body>Recently paid</Body>
      {paid.length === 0 ? <Muted>No completed payments yet.</Muted> : paid.map(item => (
        <Card key={item.id}>
          <Body>{item.tenant_name}</Body>
          <Muted>{formatCurrency(item.total_paid)} paid</Muted>
          <StatusBadge status={item.status} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryRow: { flexDirection: 'row', gap: 10 },
});
