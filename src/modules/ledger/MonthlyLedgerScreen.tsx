import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { Card } from '../../components/Card';
import { MonthSelector } from '../../components/MonthSelector';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { RentStatus } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { currentMonthYear, displayDate, todayDate } from '../../utils/dates';

const statuses: Array<'all' | RentStatus> = ['all', 'paid', 'unpaid', 'partial', 'overdue'];

export function MonthlyLedgerScreen({ navigation }: any) {
  const current = currentMonthYear();
  const paymentInFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [status, setStatus] = useState<'all' | RentStatus>('all');
  const [propertyId, setPropertyId] = useState<string | undefined>();
  const ledger = useAppStore(state => state.ledger);
  const properties = useAppStore(state => state.properties);
  const refreshLedger = useAppStore(state => state.refreshLedger);

  const load = useCallback(() => refreshLedger(month, year, status, propertyId), [month, propertyId, refreshLedger, status, year]);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    load().catch(() => { if (active) setLoadError('Could not load the ledger. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]));

  const changeMonth = (amount: number) => {
    if (paymentInFlight.current) return;
    const next = new Date(year, month - 1 + amount, 1);
    setMonth(next.getMonth() + 1); setYear(next.getFullYear());
  };

  const markPaid = async (tenantId: string, balance: number) => {
    if (balance <= 0 || paymentInFlight.current) return;
    paymentInFlight.current = true;
    setSaving(true);
    try {
      await rentCycleService.recordPayment({ amount: balance, month, paymentDate: todayDate(), paymentMode: 'cash', tenantId, year });
      Alert.alert('Payment recorded', 'The rent cycle is now paid.');
      await load().catch(() => setLoadError('Payment saved, but the ledger could not refresh. Please retry.'));
    } catch (error) {
      Alert.alert('Could not record payment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      paymentInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Monthly ledger</Title>
      <MonthSelector month={month} year={year} onChange={changeMonth} disabled={saving} />
      <Body style={styles.label}>Status</Body>
      <View style={styles.filters}>{statuses.map(item => <AppChip key={item} label={item} selected={status === item} onPress={() => { if (!paymentInFlight.current) setStatus(item); }} />)}</View>
      <Body style={styles.label}>Property</Body>
      <View style={styles.filters}>
        <AppChip label="all" selected={!propertyId} onPress={() => { if (!paymentInFlight.current) setPropertyId(undefined); }} />
        {properties.map(property => <AppChip key={property.id} label={property.name} selected={propertyId === property.id} onPress={() => { if (!paymentInFlight.current) setPropertyId(property.id); }} />)}
      </View>
      {loading ? <Muted>Loading ledger...</Muted> : loadError ? <View><Muted>{loadError}</Muted><AppButton title="Retry" onPress={() => { setLoading(true); load().then(() => setLoadError('')).catch(() => setLoadError('Could not load the ledger. Please retry.')).finally(() => setLoading(false)); }} /></View> : ledger.length === 0 ? <Muted>No rent cycles match these filters.</Muted> : ledger.map(item => (
        <Card key={item.id}>
          <Body style={styles.name}>{item.tenant_name}</Body>
          <Muted>{item.property_name} / {item.unit_name} | Due {displayDate(item.due_date)}</Muted>
          <Body>{formatCurrency(item.total_paid)} paid | {formatCurrency(item.balance)} balance</Body>
          <StatusBadge status={item.status} />
          <View style={styles.actions}>
            {item.balance > 0 ? <AppButton disabled={saving} title={saving ? 'Saving...' : 'Mark paid'} onPress={() => markPaid(item.tenant_id, item.balance)} /> : null}
            {item.balance > 0 ? <AppButton disabled={saving} title="Partial" variant="secondary" onPress={() => navigation.navigate('RecordPayment', { tenantId: item.tenant_id, cycleId: item.id })} /> : null}
            {item.balance > 0 ? <AppButton disabled={saving} title="Reminder" variant="secondary" onPress={() => navigation.navigate('ReminderPreview', { cycleId: item.id })} /> : null}
            <AppButton disabled={saving} title="Details" variant="secondary" onPress={() => navigation.navigate('TenantDetail', { tenantId: item.tenant_id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, label: { fontSize: 13, fontWeight: '600' }, name: { fontWeight: '700' } });
