import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { whatsappShareService } from '../../services/whatsappShareService';
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
  // Improvement 9: payment mode breakdown
  const [modeBreakdown, setModeBreakdown] = useState<Array<{ payment_mode: string; total: number; count: number }>>([]);
  // Improvement 8: bulk remind state
  const [remindIndex, setRemindIndex] = useState<number | null>(null);
  const overduePending = ledger.filter(item => item.status === 'overdue');

  useFocusEffect(useCallback(() => {
    refreshAll();
    paymentRepo.modeBreakdownForMonth(month, year).then(setModeBreakdown).catch(() => undefined);
  }, [refreshAll, month, year]));

  const due = ledger.filter(item => item.status !== 'paid').slice(0, 5);
  const paid = ledger.filter(item => item.status === 'paid').slice(0, 5);

  const remindAllOverdue = async () => {
    if (overduePending.length === 0) {
      Alert.alert('No overdue tenants right now.');
      return;
    }
    Alert.alert(
      'Send WhatsApp reminder',
      `Send WhatsApp reminder to ${overduePending.length} overdue tenant${overduePending.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            for (let i = 0; i < overduePending.length; i++) {
              setRemindIndex(i);
              const item = overduePending[i];
              const landlordName = settings.landlordName ?? 'Landlord';
              const msg = `Hello ${item.tenant_name}, your rent of ${formatCurrency(item.balance)} for ${monthLabel(item.month, item.year)} is overdue (due ${displayDate(item.due_date)}). Please pay as soon as possible.\n\n- ${landlordName}`;
              await whatsappShareService.shareMessage(item.tenant_phone, msg).catch(() => undefined);
            }
            setRemindIndex(null);
          },
        },
      ],
    );
  };

  const totalBreakdown = modeBreakdown.reduce((s, b) => s + b.total, 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View><Muted>{monthLabel(month, year)}</Muted><Title>{settings.landlordName ? `Hello, ${settings.landlordName}` : 'Rent Khata'}</Title></View>
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
      {totalBreakdown > 0 ? (
        <View style={styles.modeRow}>
          {modeBreakdown.map(b => (
            <View key={b.payment_mode} style={styles.modePill}>
              <Muted style={styles.modeLabel}>{b.payment_mode.replace('_', ' ').toUpperCase()}</Muted>
              <Body style={styles.modeValue}>{formatCurrency(b.total)}</Body>
            </View>
          ))}
        </View>
      ) : null}
      <SectionHeader detail={`${due.length} pending`} title="Due this month" />
      {overduePending.length > 0 ? (
        <AppButton
          title={remindIndex !== null ? `Sending ${remindIndex + 1} of ${overduePending.length}...` : 'Remind all overdue'}
          variant="secondary"
          onPress={remindAllOverdue}
        />
      ) : null}
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
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modePill: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  modeLabel: { fontSize: 10, letterSpacing: 0.5 },
  modeValue: { fontSize: 14, fontWeight: '700' },
  name: { fontWeight: '700' },
  paidAmount: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  paidRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  recordHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  recordInfo: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 12 },
});
