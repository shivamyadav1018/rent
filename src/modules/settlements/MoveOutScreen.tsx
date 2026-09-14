import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Share from 'react-native-share';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppDatePicker } from '../../components/AppDatePicker';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { ResourceState } from '../../components/ResourceState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { settlementRepo } from '../../database/repositories/settlementRepo';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { useAppStore } from '../../store/appStore';
import { colors, radius } from '../../theme';
import { PaymentMode, SettlementStatement } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { monthLabel, todayDate } from '../../utils/dates';

export const settlementText = (s: SettlementStatement) => [
  'KirayaBahi — Move-out settlement', `${s.tenantName} · ${s.propertyName} / ${s.unitName}`,
  `Move-out: ${s.moveOutDate}`, `Previous recorded bills less payments: ${formatCurrency(s.previousBalance)}`,
  `Final rent: ${formatCurrency(s.finalRent)}`, `Final electricity: ${formatCurrency(s.finalElectricity)}`,
  `Already paid for final month: ${formatCurrency(s.finalPayments)}`, `Deposit held: ${formatCurrency(s.deposit)}`,
  `Deductions: ${formatCurrency(s.deduction)}${s.deductionReason ? ` — ${s.deductionReason}` : ''}`,
  s.balance > 0 ? `Tenant owes: ${formatCurrency(s.balance)}` : s.balance < 0 ? `Refund due: ${formatCurrency(-s.balance)}` : 'Nothing due',
].join('\n');

function AmountRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.amountRow}>
      <Muted style={styles.rowLabel}>{label}</Muted>
      <Body style={[styles.rowValue, emphasis && styles.rowValueStrong]}>{value}</Body>
    </View>
  );
}

function StatementCard({
  statement,
  completed,
}: {
  statement: SettlementStatement;
  completed: boolean;
}) {
  const balanceLabel = statement.balance > 0 ? 'Tenant owes' : statement.balance < 0 ? 'Refund due' : 'Nothing due';
  const balanceColor = statement.balance > 0 ? colors.warning : statement.balance < 0 ? colors.primaryDark : colors.success;
  return (
    <Card style={styles.statementCard}>
      <View style={styles.statementStatusRow}>
        <View style={[styles.statementStatus, completed ? styles.completeStatus : styles.pendingStatus]}>
          <AppIcon color={completed ? colors.success : colors.warning} name={completed ? 'check-circle' : 'clock-outline'} size={17} />
          <Body style={[styles.statementStatusText, { color: completed ? colors.success : colors.warning }]}>
            {completed ? 'TRANSFER COMPLETED' : 'TRANSFER PENDING'}
          </Body>
        </View>
        <Muted style={styles.moveOutDate}>{statement.moveOutDate}</Muted>
      </View>

      <View style={styles.balanceHero}>
        <Muted style={styles.balanceLabel}>{balanceLabel.toUpperCase()}</Muted>
        <Body style={[styles.balanceAmount, { color: balanceColor }]}>{formatCurrency(Math.abs(statement.balance))}</Body>
        <Muted>{statement.balance > 0 ? 'Final amount to collect' : statement.balance < 0 ? 'Deposit amount to return' : 'Account fully settled'}</Muted>
      </View>

      <View style={styles.statementDivider} />
      <Body style={styles.breakdownTitle}>Settlement breakdown</Body>
      <AmountRow label="Previous bill balance" value={formatCurrency(statement.previousBalance)} />
      <AmountRow label="Final month rent" value={formatCurrency(statement.finalRent)} />
      <AmountRow label="Final electricity" value={formatCurrency(statement.finalElectricity)} />
      <AmountRow label="Already paid in final month" value={`− ${formatCurrency(statement.finalPayments)}`} />
      <AmountRow label="Deposit held" value={`− ${formatCurrency(statement.deposit)}`} />
      <AmountRow label="Other deductions" value={formatCurrency(statement.deduction)} />
      {statement.deductionReason ? <View style={styles.reasonNote}><Muted>Deduction note · {statement.deductionReason}</Muted></View> : null}
      <View style={styles.totalDivider} />
      <AmountRow label={balanceLabel} value={formatCurrency(Math.abs(statement.balance))} emphasis />
    </Card>
  );
}

export function MoveOutScreen({ route }: any) {
  const tenantId = route.params.tenantId as string;
  const resource = useFocusedResource(useCallback(async () => {
    const [existing, source] = await Promise.all([settlementRepo.findForTenant(tenantId), settlementRepo.load(tenantId)]);
    return { existing, source };
  }, [tenantId]));
  const [moveOutDate, setMoveOutDate] = useState(todayDate());
  const [deposit, setDeposit] = useState('');
  const [finalRent, setFinalRent] = useState('');
  const [finalElectricity, setFinalElectricity] = useState('');
  const [deduction, setDeduction] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [transferDate, setTransferDate] = useState(todayDate());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [reference, setReference] = useState('');
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const refreshAll = useAppStore(state => state.refreshAll);
  const changeDate = (date: string) => {
    setMoveOutDate(date); setReviewed(false);
    const bill = resource.data?.source.bills.find(row => row.year === Number(date.slice(0, 4)) && row.month === Number(date.slice(5, 7)));
    setFinalRent(String(bill?.rent_amount ?? resource.data?.source.tenant.monthly_rent ?? 0));
    setFinalElectricity(String(bill?.electricity_amount ?? resource.data?.source.tenant.electricity_amount ?? 0));
  };
  useEffect(() => {
    if (!resource.data) return;
    setDeposit(String(resource.data.source.tenant.security_deposit));
    const bill = resource.data.source.bills.find(row => row.year === Number(moveOutDate.slice(0, 4)) && row.month === Number(moveOutDate.slice(5, 7)));
    setFinalRent(String(bill?.rent_amount ?? resource.data.source.tenant.monthly_rent));
    setFinalElectricity(String(bill?.electricity_amount ?? resource.data.source.tenant.electricity_amount));
    setReviewed(false);
    // Only initialise when records reload; editing a date uses changeDate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.data]);

  if (resource.loading || !resource.data) return <ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} label="settlement" />;
  const { existing, source } = resource.data;
  const input = { moveOutDate, deposit: Number(deposit), finalRent: Number(finalRent), finalElectricity: Number(finalElectricity), deduction: Number(deduction), deductionReason };
  let statement: SettlementStatement | null = null;
  let validation = '';
  try {
    if (existing) statement = JSON.parse(existing.statement_json);
    else {
      if ([deposit, finalRent, finalElectricity, deduction].some(value => !value.trim())) throw new Error('Enter every amount, using 0 where nothing is due.');
      statement = settlementRepo.preview(source, input);
    }
  } catch (error) { validation = error instanceof Error ? error.message : 'Could not read settlement'; }
  const run = async (action: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await action(); resource.retry(); refreshAll().catch(() => undefined); }
    catch (error) { Alert.alert('Could not save', error instanceof Error ? error.message : 'Please retry.'); }
    finally { busy.current = false; setWorking(false); }
  };

  return (
    <Screen>
      <View style={styles.pageHeading}>
        <View style={styles.headingCopy}>
          <Muted style={styles.eyebrow}>TENANCY CLOSURE</Muted>
          <Title>{existing ? 'Move-out statement' : 'Settle and move out'}</Title>
          <Muted>{existing ? 'Review the final account and transfer status.' : 'Review every bill before closing this tenancy.'}</Muted>
        </View>
        <View style={styles.headingIcon}><AppIcon color={colors.primaryDark} name="home-export-outline" size={27} /></View>
      </View>

      <View style={styles.tenantStrip}>
        <View style={styles.avatar}><Body style={styles.avatarText}>{source.tenant.name.slice(0, 1).toUpperCase()}</Body></View>
        <View style={styles.tenantInfo}>
          <Body style={styles.tenantName}>{source.tenant.name}</Body>
          <Muted>{source.tenant.property_name} · {source.tenant.unit_name}</Muted>
        </View>
      </View>

      {!existing ? (
        <>
          <Card style={styles.formCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}><AppIcon color={colors.primaryDark} name="calendar-check-outline" size={20} /></View>
              <View style={styles.tenantInfo}><Body style={styles.cardTitle}>Move-out details</Body><Muted>Final billing date and agreed amounts</Muted></View>
            </View>
            <AppDatePicker label="Move-out date" maximumDate={new Date()} value={moveOutDate} onChange={changeDate} />
            <AppInput label="Deposit actually held" keyboardType="decimal-pad" value={deposit} onChangeText={value => { setDeposit(value); setReviewed(false); }} editable={!working} />
            <AppInput label="Agreed final-month rent" keyboardType="decimal-pad" value={finalRent} onChangeText={value => { setFinalRent(value); setReviewed(false); }} editable={!working} />
            <Muted style={styles.help}>Enter the agreed final amount if the last month's rent is prorated or adjusted.</Muted>
            <AppInput label="Final-month electricity total" keyboardType="decimal-pad" value={finalElectricity} onChangeText={value => { setFinalElectricity(value); setReviewed(false); }} editable={!working} />
          </Card>

          <Card style={styles.formCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}><AppIcon color={colors.primaryDark} name="receipt-text-outline" size={20} /></View>
              <View style={styles.tenantInfo}><Body style={styles.cardTitle}>Deductions</Body><Muted>Damage, cleaning, or another agreement</Muted></View>
            </View>
            <AppInput label="Other agreed deductions" keyboardType="decimal-pad" value={deduction} onChangeText={value => { setDeduction(value); setReviewed(false); }} editable={!working} />
            <AppInput label="Deduction reason" multiline value={deductionReason} onChangeText={value => { setDeductionReason(value); setReviewed(false); }} editable={!working} />
          </Card>

          <Card style={styles.billsCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardIcon}><AppIcon color={colors.primaryDark} name="book-open-page-variant-outline" size={20} /></View>
              <View style={styles.tenantInfo}><Body style={styles.cardTitle}>Recorded bills included</Body><Muted>{source.bills.length} monthly record{source.bills.length === 1 ? '' : 's'}</Muted></View>
            </View>
            {source.bills.length ? source.bills.map(bill => (
              <View key={bill.id} style={styles.billRow}>
                <View><Body style={styles.billMonth}>{monthLabel(bill.month, bill.year)}</Body><Muted>Rent {formatCurrency(bill.rent_amount)} + electricity {formatCurrency(bill.electricity_amount)}</Muted></View>
                <View style={styles.billPaid}><Muted>PAID</Muted><Body style={styles.paidValue}>{formatCurrency(bill.paid)}</Body></View>
              </View>
            )) : <Muted>No previous bills recorded.</Muted>}
            <View style={styles.infoNote}><AppIcon color={colors.primaryDark} name="information-outline" size={19} /><Muted style={styles.infoText}>Add any missing older bills and payments before finalising. The final month uses the agreed amounts above.</Muted></View>
          </Card>
        </>
      ) : null}

      {validation ? <View style={styles.validation}><AppIcon color={colors.danger} name="alert-circle-outline" size={19} /><Muted style={styles.validationText}>{validation}</Muted></View> : null}
      {statement ? <StatementCard statement={statement} completed={Boolean(existing?.transfer_date) || statement.balance === 0} /> : null}

      {!existing ? (
        <>
          <View style={styles.reviewBlock}>
            <AppChip label={reviewed ? '✓ Bills and deposit checked' : 'I checked all bills, payments and deposit'} selected={reviewed} onPress={() => setReviewed(!reviewed)} />
            <Muted style={styles.reviewHelp}>Confirmation locks this statement and releases the unit.</Muted>
          </View>
          <AppButton
            icon={<AppIcon color={colors.surface} name="check-circle-outline" size={19} />}
            title={working ? 'Saving…' : 'Confirm settlement & move out'}
            disabled={working || !statement || !reviewed}
            onPress={() => {
              if (!statement) return;
              const confirmed = statement;
              Alert.alert('Finalise this settlement?', 'This closes the tenancy and releases the room. The statement and included payment records will be locked. Refunds and final collections are recorded separately.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm move-out', onPress: () => run(() => settlementRepo.finalize(tenantId, input, confirmed)) },
              ]);
            }}
          />
        </>
      ) : (
        <>
          <AppButton
            icon={<AppIcon color={colors.primaryDark} name="share-variant-outline" size={19} />}
            title="Share statement"
            variant="secondary"
            disabled={!statement || working}
            onPress={async () => {
              if (!statement) return;
              try { await Share.open({ failOnCancel: false, message: `${settlementText(statement)}\n${existing.transfer_date ? `Completed: ${existing.transfer_date} ${existing.transfer_mode ?? ''} ${existing.transfer_reference ?? ''}` : 'Transfer pending'}` }); }
              catch { Alert.alert('Could not share statement', 'Please retry.'); }
            }}
          />
          {!existing.transfer_date && existing.balance !== 0 ? (
            <Card style={styles.transferCard}>
              <View style={styles.cardHeading}>
                <View style={[styles.cardIcon, existing.balance < 0 && styles.refundIcon]}>
                  <AppIcon color={existing.balance > 0 ? colors.warning : colors.primaryDark} name={existing.balance > 0 ? 'cash-plus' : 'cash-refund'} size={21} />
                </View>
                <View style={styles.tenantInfo}>
                  <Body style={styles.cardTitle}>{existing.balance > 0 ? 'Record final collection' : 'Record deposit refund'}</Body>
                  <Muted>{formatCurrency(Math.abs(existing.balance))} {existing.balance > 0 ? 'to receive' : 'to return'}</Muted>
                </View>
              </View>
              <View style={styles.infoNote}>
                <AppIcon color={colors.primaryDark} name="information-outline" size={19} />
                <Muted style={styles.infoText}>Record this only after the full transfer is complete. KirayaBahi records the result; it does not move money.</Muted>
              </View>
              <AppDatePicker label="Transfer date" maximumDate={new Date()} value={transferDate} onChange={setTransferDate} />
              <Body style={styles.fieldLabel}>Payment method</Body>
              <View style={styles.modes}>
                {(['cash', 'upi', 'bank_transfer', 'cheque', 'other'] as PaymentMode[]).map(item => <AppChip key={item} label={item.replace('_', ' ')} selected={mode === item} onPress={() => setMode(item)} />)}
              </View>
              <AppInput label="Transfer reference / note" value={reference} onChangeText={setReference} editable={!working} />
              <AppButton
                icon={<AppIcon color={colors.surface} name="check" size={19} />}
                title={existing.balance > 0 ? 'Mark full amount received' : 'Mark full amount refunded'}
                disabled={working}
                onPress={() => Alert.alert('Confirm completed transfer?', `Record the full ${formatCurrency(Math.abs(existing.balance))} as ${existing.balance > 0 ? 'received' : 'refunded'}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: () => run(() => settlementRepo.completeTransfer(tenantId, transferDate, mode, reference)) },
                ])}
              />
            </Card>
          ) : null}
          {existing.transfer_date ? (
            <View style={styles.completedNote}>
              <AppIcon color={colors.success} name="check-decagram-outline" size={22} />
              <View style={styles.tenantInfo}>
                <Body style={styles.completedTitle}>Transfer recorded</Body>
                <Muted>{existing.transfer_date}{existing.transfer_mode ? ` · ${existing.transfer_mode.replace('_', ' ')}` : ''}{existing.transfer_reference ? ` · ${existing.transfer_reference}` : ''}</Muted>
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountRow: { alignItems: 'center', flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: colors.surface, fontSize: 17, fontWeight: '800' },
  balanceAmount: { fontSize: 34, fontWeight: '800', marginVertical: 3 },
  balanceHero: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.lg, padding: 18 },
  balanceLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  billMonth: { fontWeight: '700' },
  billPaid: { alignItems: 'flex-end' },
  billRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  billsCard: { gap: 13 },
  breakdownTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  cardIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 11, height: 40, justifyContent: 'center', width: 40 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  completeStatus: { backgroundColor: colors.successSoft },
  completedNote: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.lg, flexDirection: 'row', gap: 12, padding: 16 },
  completedTitle: { color: colors.success, fontWeight: '800' },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  formCard: { gap: 14 },
  headingCopy: { flex: 1, gap: 4 },
  headingIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  help: { backgroundColor: colors.background, borderRadius: radius.sm, fontSize: 12, lineHeight: 17, padding: 10 },
  infoNote: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: 9, padding: 12 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moveOutDate: { fontSize: 12 },
  pageHeading: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  paidValue: { color: colors.success, fontWeight: '700' },
  pendingStatus: { backgroundColor: colors.warningSoft },
  reasonNote: { backgroundColor: colors.warningSoft, borderRadius: radius.sm, padding: 10 },
  refundIcon: { backgroundColor: colors.primarySoft },
  reviewBlock: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: 8, padding: 14 },
  reviewHelp: { fontSize: 11, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  rowValueStrong: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  statementCard: { gap: 12 },
  statementDivider: { backgroundColor: colors.border, height: 1 },
  statementStatus: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  statementStatusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statementStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  tenantInfo: { flex: 1, gap: 2 },
  tenantName: { fontSize: 16, fontWeight: '800' },
  tenantStrip: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', gap: 12, padding: 14 },
  totalDivider: { borderStyle: 'dashed', borderTopColor: colors.border, borderTopWidth: 1, marginTop: 2 },
  transferCard: { gap: 14 },
  validation: { alignItems: 'flex-start', backgroundColor: colors.dangerSoft, borderRadius: radius.md, flexDirection: 'row', gap: 9, padding: 12 },
  validationText: { color: colors.danger, flex: 1 },
});
