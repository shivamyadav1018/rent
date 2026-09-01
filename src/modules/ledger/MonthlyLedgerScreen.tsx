import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { RentStatus } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { currentMonthYear, displayDate, monthLabel } from '../../utils/dates';
import { colors, fontFamily } from '../../theme';

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
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

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
      <Text style={styles.label}>Status</Text>
      <View style={styles.filters}>{statuses.map(item => <Pressable key={item} onPress={() => setStatus(item)} style={[styles.filter, status === item && styles.selected]}><Text style={status === item ? styles.selectedText : styles.filterText}>{item}</Text></Pressable>)}</View>
      <Text style={styles.label}>Property</Text>
      <View style={styles.filters}>
        <Pressable onPress={() => setPropertyId(undefined)} style={[styles.filter, !propertyId && styles.selected]}><Text style={!propertyId ? styles.selectedText : styles.filterText}>all</Text></Pressable>
        {properties.map(property => <Pressable key={property.id} onPress={() => setPropertyId(property.id)} style={[styles.filter, propertyId === property.id && styles.selected]}><Text style={propertyId === property.id ? styles.selectedText : styles.filterText}>{property.name}</Text></Pressable>)}
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

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filter: { backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 }, filterText: { color: colors.ink, fontFamily, textTransform: 'capitalize' }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' }, month: { flex: 1, fontWeight: '700', textAlign: 'center' }, monthRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, name: { fontWeight: '700' }, selected: { backgroundColor: colors.primary }, selectedText: { color: colors.surface, fontFamily, fontWeight: '700', textTransform: 'capitalize' } });
