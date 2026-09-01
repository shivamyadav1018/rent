import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, BookOpen, IndianRupee, MessageCircle, UserPlus } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { SummaryCard } from '../../components/SummaryCard';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel, currentMonthYear } from '../../utils/dates';
import { colors } from '../../theme';

export function DashboardScreen({ navigation }: any) {
  const { month, year } = currentMonthYear();
  const summary = useAppStore(state => state.summary);
  const ledger = useAppStore(state => state.ledger);
  const refreshAll = useAppStore(state => state.refreshAll);
  const settings = useAppStore(state => state.settings);

  useFocusEffect(useCallback(() => {
    refreshAll();
  }, [refreshAll]));

  const due = ledger.filter(item => item.status !== 'paid').slice(0, 5);
  const paid = ledger.filter(item => item.status === 'paid').slice(0, 5);

  return (
    <Screen>
      <View style={styles.header}>
        <View><Muted>{monthLabel(month, year)}</Muted><Title>{settings.landlordName ? `Hello, ${settings.landlordName}` : 'KirayaBahi'}</Title></View>
        <View style={styles.logo}><BookOpen color={colors.surface} size={22} /></View>
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard label="Expected" tone="ink" value={formatCurrency(summary.expectedRent)} />
        <SummaryCard label="Collected" tone="green" value={formatCurrency(summary.collectedRent)} />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard label="Pending" tone="gold" value={formatCurrency(summary.pendingRent)} />
        <SummaryCard label="Overdue tenants" tone="coral" value={String(summary.overdueCount)} />
      </View>
      <SectionHeader title="Quick actions" />
      <View style={styles.actions}>
        <AppButton icon={<UserPlus color={colors.surface} size={17} />} style={styles.action} title="Add tenant" onPress={() => navigation.navigate('AddTenant')} />
        <AppButton icon={<IndianRupee color={colors.primary} size={17} />} style={styles.action} title="Record payment" onPress={() => navigation.navigate('RecordPayment')} variant="secondary" />
        <AppButton icon={<BookOpen color={colors.primary} size={17} />} style={styles.action} title="View ledger" onPress={() => navigation.navigate('Ledger')} variant="secondary" />
      </View>
      <SectionHeader detail={`${due.length} pending`} title="Due this month" />
      {due.length === 0 ? <EmptyState message="No pending rent for this month." /> : due.map(item => (
        <Card key={item.id}>
          <View style={styles.recordHeader}><View style={styles.recordInfo}><Body style={styles.name}>{item.tenant_name}</Body><Muted>{item.property_name} · {item.unit_name}</Muted></View><StatusBadge status={item.status} /></View>
          <View style={styles.amountRow}><View><Muted>Balance</Muted><Body style={styles.amount}>{formatCurrency(item.balance)}</Body></View><Muted>Due {displayDate(item.due_date)}</Muted></View>
          <AppButton icon={<MessageCircle color={colors.primary} size={17} />} title="Send reminder" onPress={() => navigation.navigate('ReminderPreview', { cycleId: item.id })} variant="secondary" />
        </Card>
      ))}
      <SectionHeader detail={`${paid.length} shown`} title="Recently paid" />
      {paid.length === 0 ? <EmptyState message="Completed payments will appear here." /> : paid.map(item => (
        <Card key={item.id}>
          <View style={styles.recordHeader}><View style={styles.recordInfo}><Body style={styles.name}>{item.tenant_name}</Body><Muted>{item.property_name} · {item.unit_name}</Muted></View><StatusBadge status={item.status} /></View>
          <View style={styles.paidRow}><Body style={styles.paidAmount}>{formatCurrency(item.total_paid)}</Body><ArrowRight color={colors.muted} size={17} /></View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amount: { fontSize: 18, fontWeight: '700' },
  amountRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  logo: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  name: { fontWeight: '700' },
  paidAmount: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  paidRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  recordHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  recordInfo: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 12 },
});
