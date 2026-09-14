import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { ResourceState } from '../../components/ResourceState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { rentRepo } from '../../database/repositories/rentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { whatsappShareService } from '../../services/whatsappShareService';
import { colors, radius } from '../../theme';
import { LedgerItem } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, isPastDue, monthLabel } from '../../utils/dates';

const createMessage = (cycle: LedgerItem, landlordName: string) => cycle.balance > 0 && isPastDue(cycle.due_date)
  ? `Hello ${cycle.tenant_name}, your remaining payment of ${formatCurrency(cycle.balance)} for ${monthLabel(cycle.month, cycle.year)} was due on ${displayDate(cycle.due_date)}. Bill: Rent ${formatCurrency(cycle.rent_amount)} + Electricity ${formatCurrency(cycle.electricity_amount)} = ${formatCurrency(cycle.total_payable)}. Please clear it soon.\n\n- ${landlordName}`
  : `Hello ${cycle.tenant_name}, your remaining payment of ${formatCurrency(cycle.balance)} for ${monthLabel(cycle.month, cycle.year)} is pending. Bill: Rent ${formatCurrency(cycle.rent_amount)} + Electricity ${formatCurrency(cycle.electricity_amount)} = ${formatCurrency(cycle.total_payable)}. Please pay when possible.\n\n- ${landlordName}`;

export function ReminderPreviewScreen({ route }: any) {
  const [message, setMessage] = useState('');
  const cycleId = route.params.cycleId as string;
  const { data, loading, error, retry } = useFocusedResource(useCallback(async () => {
    const [cycle, settings] = await Promise.all([rentRepo.findLedgerItem(cycleId), settingsRepo.getAll()]);
    if (!cycle) throw new Error('Rent cycle not found.');
    if (cycle.settlement_id) throw new Error('This tenancy is closed. Open its move-out settlement for the final balance.');
    return { cycle, message: createMessage(cycle, settings.landlordName ?? 'Landlord') };
  }, [cycleId]));
  useEffect(() => { if (data) setMessage(data.message); }, [data]);

  if (loading || !data) return <ResourceState loading={loading} error={error} label="reminder" retry={retry} />;
  const { cycle } = data;
  const overdue = cycle.balance > 0 && isPastDue(cycle.due_date);

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Muted style={styles.eyebrow}>PAYMENT FOLLOW-UP</Muted>
          <Title>Send a reminder</Title>
          <Muted>Review the message before opening WhatsApp.</Muted>
        </View>
        <View style={[styles.heroIcon, overdue && styles.heroIconOverdue]}>
          <AppIcon color={overdue ? colors.warning : colors.primaryDark} name="message-text-outline" size={28} />
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.tenantRow}>
          <View style={styles.avatar}><Body style={styles.avatarText}>{cycle.tenant_name.slice(0, 1).toUpperCase()}</Body></View>
          <View style={styles.tenantInfo}>
            <Body style={styles.tenantName}>{cycle.tenant_name}</Body>
            <Muted>{cycle.property_name} · {cycle.unit_name}</Muted>
          </View>
          <View style={[styles.statusPill, overdue && styles.statusPillOverdue]}>
            <Body style={[styles.statusText, overdue && styles.statusTextOverdue]}>{overdue ? 'OVERDUE' : 'PENDING'}</Body>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.balanceRow}>
          <View>
            <Muted style={styles.smallLabel}>AMOUNT TO COLLECT</Muted>
            <Body style={styles.amount}>{formatCurrency(cycle.balance)}</Body>
          </View>
          <View style={styles.dueBlock}>
            <Muted style={styles.smallLabel}>DUE DATE</Muted>
            <Body style={styles.dueDate}>{displayDate(cycle.due_date)}</Body>
          </View>
        </View>
      </Card>

      <View style={styles.messageHeading}>
        <View>
          <Body style={styles.sectionTitle}>Message preview</Body>
          <Muted>Edit the wording if needed</Muted>
        </View>
        <View style={styles.whatsappPill}>
          <AppIcon color={colors.success} name="whatsapp" size={17} />
          <Body style={styles.whatsappLabel}>WhatsApp</Body>
        </View>
      </View>
      <AppInput label="Reminder message" multiline numberOfLines={9} value={message} onChangeText={setMessage} />

      <AppButton
        icon={<AppIcon color={colors.surface} name="whatsapp" size={20} />}
        title="Send on WhatsApp"
        onPress={() => whatsappShareService.shareMessage(cycle.tenant_phone, message).catch(() => Alert.alert('Could not share reminder', 'Please try again.'))}
      />
      <AppButton
        icon={<AppIcon color={colors.primaryDark} name="content-copy" size={19} />}
        title="Copy message"
        variant="secondary"
        onPress={() => { Clipboard.setString(message); Alert.alert('Copied', 'Reminder copied to clipboard.'); }}
      />
      <View style={styles.tip}>
        <AppIcon color={colors.primaryDark} name="shield-check-outline" size={19} />
        <Muted style={styles.tipText}>KirayaBahi only prepares the message. You choose the recipient and send it from WhatsApp.</Muted>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 3 },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { color: colors.primaryDark, fontSize: 19, fontWeight: '800' },
  balanceRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  divider: { backgroundColor: colors.border, height: 1 },
  dueBlock: { alignItems: 'flex-end' },
  dueDate: { fontSize: 15, fontWeight: '700', marginTop: 5 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  headingCopy: { flex: 1, gap: 4 },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  heroIconOverdue: { backgroundColor: colors.warningSoft },
  messageHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  smallLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  statusPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillOverdue: { backgroundColor: colors.warningSoft },
  statusText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800' },
  statusTextOverdue: { color: colors.warning },
  summaryCard: { gap: 16 },
  tenantInfo: { flex: 1, gap: 3 },
  tenantName: { fontSize: 17, fontWeight: '800' },
  tenantRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  tip: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: 10, padding: 14 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
  whatsappLabel: { color: colors.success, fontSize: 12, fontWeight: '700' },
  whatsappPill: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
});
