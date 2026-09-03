import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
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
import { colors, fontFamily, radius } from '../../theme';

export function DashboardScreen({ navigation }: any) {
  const { month, year } = currentMonthYear();
  const summary = useAppStore(state => state.summary);
  const ledger = useAppStore(state => state.ledger);
  const refreshAll = useAppStore(state => state.refreshAll);
  const settings = useAppStore(state => state.settings);

  useFocusEffect(useCallback(() => {
    refreshAll().catch(() => undefined);
  }, [refreshAll]));

  const due = ledger.filter(item => item.status !== 'paid').slice(0, 5);
  const paid = ledger.filter(item => item.status === 'paid').slice(0, 5);

  return (
    <Screen>
      {/* ── Gradient header card ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLogoWrap}>
            <AppIcon color={colors.surface} name="book-open-page-variant-outline" size={21} />
          </View>
          <Muted style={styles.headerMonth}>{monthLabel(month, year)}</Muted>
        </View>
        <View style={styles.headerGreeting}>
          <Title style={styles.headerName}>
            {settings.landlordName ? `Hello, ${settings.landlordName}` : 'KirayaBahi'}
          </Title>
          {settings.landlordName ? <AppIcon color={colors.surface} name="hand-wave-outline" size={21} /> : null}
        </View>
        <Muted style={styles.headerSub}>Here's your rent summary for this month</Muted>
      </View>

      {/* ── Summary grid ── */}
      <View style={styles.summaryRow}>
        <SummaryCard label="Expected" tone="ink" value={formatCurrency(summary.expectedRent)} />
        <SummaryCard label="Collected" tone="green" value={formatCurrency(summary.collectedRent)} />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard label="Pending" tone="gold" value={formatCurrency(summary.pendingRent)} />
        <SummaryCard label="Overdue" tone="coral" value={String(summary.overdueCount)} />
      </View>

      {/* ── Quick actions ── */}
      <SectionHeader title="Quick actions" />
      <View style={styles.actions}>
        <AppButton
          icon={<AppIcon color={colors.surface} name="account-plus-outline" size={19} />}
          style={styles.action}
          title="Add tenant"
          onPress={() => navigation.navigate('AddTenant')}
        />
        <AppButton
          icon={<AppIcon color={colors.primaryDark} name="currency-inr" size={19} />}
          style={styles.action}
          title="Record payment"
          onPress={() => navigation.navigate('RecordPayment')}
          variant="secondary"
        />
        <AppButton
          icon={<AppIcon color={colors.primaryDark} name="book-open-page-variant-outline" size={19} />}
          style={styles.action}
          title="Ledger"
          onPress={() => navigation.navigate('Ledger')}
          variant="secondary"
        />
      </View>

      {/* ── Due this month ── */}
      <SectionHeader detail={`${due.length} pending`} title="Due this month" />
      {due.length === 0
        ? <EmptyState message="No pending rent for this month." />
        : due.map(item => (
          <Card key={item.id}>
            <View style={styles.recordHeader}>
              <View style={styles.recordInfo}>
                <Body style={styles.name}>{item.tenant_name}</Body>
                <Muted>{item.property_name} · {item.unit_name}</Muted>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.amountRow}>
              <View>
                <Muted style={styles.balanceLabel}>Balance due</Muted>
                <Body style={styles.amount}>{formatCurrency(item.balance)}</Body>
              </View>
              <Muted>Due {displayDate(item.due_date)}</Muted>
            </View>
            <AppButton
              icon={<AppIcon color={colors.primaryDark} name="message-text-outline" size={19} />}
              title="Send reminder"
              onPress={() => navigation.navigate('ReminderPreview', { cycleId: item.id })}
              variant="secondary"
            />
          </Card>
        ))}

      {/* ── Recently paid ── */}
      <SectionHeader detail={`${paid.length} shown`} title="Recently paid" />
      {paid.length === 0
        ? <EmptyState message="Completed payments will appear here." />
        : paid.map(item => (
          <Card key={item.id}>
            <View style={styles.recordHeader}>
              <View style={styles.recordInfo}>
                <Body style={styles.name}>{item.tenant_name}</Body>
                <Muted>{item.property_name} · {item.unit_name}</Muted>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={styles.paidRow}>
              <Body style={styles.paidAmount}>{formatCurrency(item.total_paid)}</Body>
              <AppIcon color={colors.muted} name="arrow-right" size={19} />
            </View>
          </Card>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amount: { fontSize: 19, fontWeight: '800' },
  amountRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    gap: 6,
    marginBottom: 4,
    padding: 20,
    paddingBottom: 22,
  },
  headerGreeting: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  headerLogoWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerMonth: { color: 'rgba(255,255,255,0.75)', fontFamily, fontSize: 13 },
  headerName: { color: colors.surface, flexShrink: 1, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  headerTop: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginBottom: 8 },
  name: { fontWeight: '700' },
  paidAmount: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  paidRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  recordHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  recordInfo: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 12 },
});
