import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { RentStatus } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { currentMonthYear, displayDate, monthLabel } from '../../utils/dates';

const statuses: Array<'all' | RentStatus> = ['all', 'paid', 'unpaid', 'partial', 'overdue'];

export function MonthlyLedgerScreen({ navigation }: any) {
  const current = currentMonthYear();
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [status, setStatus] = useState<'all' | RentStatus>('all');
  const [propertyId, setPropertyId] = useState<string | undefined>();
  const ledger = useAppStore(state => state.ledger);
  const properties = useAppStore(state => state.properties);
  const refreshLedger = useAppStore(state => state.refreshLedger);

  const load = useCallback(() => refreshLedger(month, year, status, propertyId), [month, propertyId, refreshLedger, status, year]);
  useFocusEffect(useCallback(() => {
    load().catch(() => undefined);
  }, [load]));

  const changeMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1);
    setMonth(next.getMonth() + 1); setYear(next.getFullYear());
  };

  const markPaid = async (tenantId: string, balance: number) => {
    if (balance <= 0) return;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, no UTC shift
    await rentCycleService.recordPayment({ amount: balance, month, paymentDate: today, paymentMode: 'cash', tenantId, year });
    await load();
    Alert.alert('Payment recorded', 'The rent cycle is now paid.');
  };

  return (
    <Screen>
      <Title>Monthly ledger</Title>
      <View style={styles.monthRow}>
        <AppButton title="Previous" variant="secondary" onPress={() => changeMonth(-1)} />
        <Body style={styles.month}>{monthLabel(month, year)}</Body>
        <AppButton title="Next" variant="secondary" onPress={() => changeMonth(1)} />
      </View>
      <Body style={styles.label}>Status</Body>
      <View style={styles.filters}>{statuses.map(item => <AppChip key={item} label={item} selected={status === item} onPress={() => setStatus(item)} />)}</View>
      <Body style={styles.label}>Property</Body>
      <View style={styles.filters}>
        <AppChip label="all" selected={!propertyId} onPress={() => setPropertyId(undefined)} />
        {properties.map(property => <AppChip key={property.id} label={property.name} selected={propertyId === property.id} onPress={() => setPropertyId(property.id)} />)}
      </View>
      {ledger.length === 0 ? <Muted>No rent cycles match these filters.</Muted> : ledger.map(item => (
        <Card key={item.id}>
          <Body style={styles.name}>{item.tenant_name}</Body>
          <Muted>{item.property_name} / {item.unit_name} | Due {displayDate(item.due_date)}</Muted>
          <Body>{formatCurrency(item.total_paid)} paid | {formatCurrency(item.balance)} balance</Body>
          <StatusBadge status={item.status} />
          <View style={styles.actions}>
            {item.balance > 0 ? <AppButton title="Mark paid" onPress={() => markPaid(item.tenant_id, item.balance)} /> : null}
            {item.balance > 0 ? <AppButton title="Partial" variant="secondary" onPress={() => navigation.navigate('RecordPayment', { tenantId: item.tenant_id, cycleId: item.id })} /> : null}
            {item.balance > 0 ? <AppButton title="Reminder" variant="secondary" onPress={() => navigation.navigate('ReminderPreview', { cycleId: item.id })} /> : null}
            <AppButton title="Details" variant="secondary" onPress={() => navigation.navigate('TenantDetail', { tenantId: item.tenant_id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, label: { fontSize: 13, fontWeight: '600' }, month: { flex: 1, fontWeight: '700', textAlign: 'center' }, monthRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, name: { fontWeight: '700' } });
