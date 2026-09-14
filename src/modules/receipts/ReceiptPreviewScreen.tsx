import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { ResourceState } from '../../components/ResourceState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { settingsRepo } from '../../database/repositories/settingsRepo';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { receiptPdfService } from '../../services/receiptPdfService';
import { useAppStore } from '../../store/appStore';
import { colors, fontFamily, radius, shadow } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';
import { receiptNumberForPayment } from '../../utils/ids';

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Muted style={styles.detailLabel}>{label}</Muted>
      <Body style={[styles.detailValue, strong ? styles.detailStrong : null]}>{value}</Body>
    </View>
  );
}

export function ReceiptPreviewScreen({ route }: any) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [reason, setReason] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const refreshAll = useAppStore(state => state.refreshAll);

  const params = route.params;
  const resource = useFocusedResource(useCallback(async () => {
    const [cycle, payment, settings] = await Promise.all([
      rentRepo.findLedgerItem(params.cycleId),
      params.paymentId ? paymentRepo.find(params.paymentId) : paymentRepo.latestForCycle(params.cycleId),
      settingsRepo.getAll(),
    ]);
    if (!cycle) throw new Error('Rent cycle not found.');
    if (payment && payment.rent_cycle_id !== cycle.id) throw new Error('Payment does not belong to this rent cycle');
    return { cycle, data: payment, landlordName: payment?.receipt_landlord ?? settings.landlordName ?? 'Landlord' };
  }, [params]));
  const { cycle, data, landlordName } = resource.data ?? {};
  useEffect(() => { setFilePath(null); }, [resource.data]);

  const buildAndGenerate = async () => {
    if (!cycle || !data) return undefined;
    setWorking(true);
    try {
      const html = await receiptPdfService.buildHtml({ cycle, payment: data });
      const path = await receiptPdfService.generate(html);
      if (path) {
        setFilePath(path);
        await settingsRepo.set(`receipt:${data.id}`, path);
        Alert.alert('Receipt ready', 'Your PDF was saved successfully.');
      }
      return path;
    } catch (error) {
      Alert.alert('Could not generate receipt', error instanceof Error ? error.message : 'Please try again.');
    } finally { setWorking(false); }
  };

  const share = async () => {
    try {
      const path = filePath ?? await buildAndGenerate();
      if (path) await receiptPdfService.share(path);
    } catch (error) {
      Alert.alert('Could not share receipt', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (resource.loading || !cycle) return <ResourceState loading={resource.loading} error={resource.error} label="receipt" retry={resource.retry} />;
  if (!data) return <Screen><Title>Receipt</Title><Muted>No payment exists for this rent cycle yet.</Muted></Screen>;

  const tenantName = data.receipt_tenant ?? cycle.tenant_name;
  const propertyName = data.receipt_property ?? cycle.property_name;
  const unitName = data.receipt_unit ?? cycle.unit_name;
  const receiptNumber = receiptNumberForPayment(data.id);
  const hasSnapshot = data.receipt_rent != null && data.receipt_electricity != null && data.receipt_balance != null;
  const totalPayable = hasSnapshot ? data.receipt_rent! + data.receipt_electricity! : null;

  return (
    <Screen style={styles.screen}>
      <View style={styles.pageHeader}>
        <View>
          <Muted style={styles.eyebrow}>PAYMENT RECEIPT</Muted>
          <Title>Receipt details</Title>
        </View>
        <View style={[styles.headerIcon, data.voided_at ? styles.headerIconVoid : null]}>
          <AppIcon color={data.voided_at ? colors.danger : colors.success} name={data.voided_at ? 'close' : 'check'} size={26} />
        </View>
      </View>

      <View style={styles.receiptCard}>
        <View style={[styles.statusBand, data.voided_at ? styles.statusBandVoid : null]}>
          <AppIcon color={data.voided_at ? colors.danger : colors.success} name={data.voided_at ? 'alert-circle-outline' : 'check-circle'} size={18} />
          <Body style={[styles.statusText, data.voided_at ? styles.statusTextVoid : null]}>
            {data.voided_at ? 'PAYMENT VOIDED' : 'PAYMENT RECEIVED'}
          </Body>
        </View>

        <View style={styles.amountBlock}>
          <Muted>Amount received</Muted>
          <Body style={styles.amount}>{formatCurrency(data.amount)}</Body>
          <Muted>{displayDate(data.payment_date)} · {data.payment_mode.replace('_', ' ')}</Muted>
        </View>

        <View style={styles.dashedRule} />

        <View style={styles.identityBlock}>
          <View style={styles.avatar}>
            <Body style={styles.avatarText}>{tenantName.trim().charAt(0).toUpperCase() || 'T'}</Body>
          </View>
          <View style={styles.identityText}>
            <Muted>Received from</Muted>
            <Body style={styles.tenantName}>{tenantName}</Body>
            <Muted>{propertyName} · {unitName}</Muted>
          </View>
        </View>

        <View style={styles.dashedRule} />

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Payment breakdown</Body>
          {hasSnapshot ? (
            <>
              <DetailRow label="Monthly rent" value={formatCurrency(data.receipt_rent!)} />
              <DetailRow label="Electricity" value={formatCurrency(data.receipt_electricity!)} />
              <View style={styles.thinRule} />
              <DetailRow label="Total bill" value={formatCurrency(totalPayable!)} strong />
              <DetailRow
                label={data.receipt_balance! < 0 ? 'Advance balance' : 'Balance remaining'}
                value={formatCurrency(Math.abs(data.receipt_balance!))}
                strong
              />
            </>
          ) : (
            <View style={styles.historyNote}>
              <AppIcon color={colors.warning} name="information-outline" size={19} />
              <Muted style={styles.historyText}>This older payment was saved before bill snapshots were introduced. Its original rent balance is unavailable.</Muted>
            </View>
          )}
        </View>

        <View style={styles.dashedRule} />

        <View style={styles.section}>
          <DetailRow label="Rent period" value={monthLabel(cycle.month, cycle.year)} />
          <DetailRow label="Landlord" value={landlordName ?? 'Landlord'} />
          <DetailRow label="Reference" value={data.reference_no || 'Not provided'} />
          {data.notes ? <DetailRow label="Note" value={data.notes} /> : null}
        </View>

        <View style={styles.receiptFooter}>
          <Muted style={styles.receiptLabel}>RECEIPT NUMBER</Muted>
          <Body numberOfLines={1} adjustsFontSizeToFit style={styles.receiptNumber}>{receiptNumber}</Body>
          <Muted style={styles.brandLine}>Recorded securely with KirayaBahi</Muted>
        </View>

        {data.voided_at ? (
          <View style={styles.voidNotice}>
            <Body style={styles.voidTitle}>This receipt is void</Body>
            <Muted style={styles.voidText}>{data.void_reason || 'No reason provided'} · {displayDate(data.voided_at)}</Muted>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <AppButton
          disabled={working}
          icon={<AppIcon color={colors.surface} name="share-variant-outline" size={19} />}
          style={styles.primaryAction}
          title={working ? 'Preparing…' : 'Share receipt'}
          onPress={share}
        />
        <AppButton
          disabled={working}
          icon={<AppIcon color={colors.primaryDark} name="file-pdf-box" size={20} />}
          style={styles.secondaryAction}
          title="Save PDF"
          variant="secondary"
          onPress={buildAndGenerate}
        />
      </View>
      {filePath ? (
        <View style={styles.savedNote}>
          <AppIcon color={colors.success} name="check-circle-outline" size={17} />
          <Muted style={styles.savedText}>PDF saved on this device</Muted>
        </View>
      ) : null}

      {!data.voided_at ? (
        <View style={styles.correctionCard}>
          <Pressable accessibilityRole="button" onPress={() => setShowCorrection(value => !value)} style={styles.correctionHeader}>
            <View style={styles.correctionTitleRow}>
              <AppIcon color={colors.muted} name="pencil-outline" size={19} />
              <Body style={styles.correctionTitle}>Payment entered incorrectly?</Body>
            </View>
            <AppIcon color={colors.muted} name={showCorrection ? 'chevron-up' : 'chevron-down'} size={22} />
          </Pressable>
          {showCorrection ? (
            <View style={styles.correctionBody}>
              <Muted>Voiding removes this payment from rent totals while keeping an audit record. Record the correct payment separately.</Muted>
              <AppInput label="Reason for correction" value={reason} onChangeText={setReason} editable={!working} />
              <AppButton title="Void this payment" variant="danger" disabled={working || !reason.trim()} onPress={() => {
                Alert.alert('Void this payment?', 'This payment will be excluded from rent totals. Its receipt will remain visible and marked void.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Void payment', style: 'destructive', onPress: async () => {
                    setWorking(true);
                    try {
                      await paymentRepo.voidPayment(data.id, reason);
                      setFilePath(null);
                      resource.retry();
                      refreshAll().catch(() => undefined);
                    } catch (error) {
                      Alert.alert('Could not void payment', error instanceof Error ? error.message : 'Please retry.');
                    } finally { setWorking(false); }
                  } },
                ]);
              }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  amount: { color: colors.ink, fontFamily, fontSize: 38, fontWeight: '800', letterSpacing: -1, lineHeight: 46 },
  amountBlock: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '800' },
  brandLine: { fontSize: 11, marginTop: 5, textAlign: 'center' },
  correctionBody: { borderTopColor: colors.border, borderTopWidth: 1, gap: 12, padding: 16 },
  correctionCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  correctionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 58, paddingHorizontal: 16 },
  correctionTitle: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  correctionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  dashedRule: { borderTopColor: colors.border, borderTopWidth: 1, borderStyle: 'dashed' },
  detailLabel: { flex: 1 },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  detailStrong: { color: colors.ink, fontWeight: '700' },
  detailValue: { flex: 1.35, fontSize: 14, textAlign: 'right', textTransform: 'capitalize' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  headerIcon: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  headerIconVoid: { backgroundColor: colors.dangerSoft },
  historyNote: { alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: radius.md, flexDirection: 'row', gap: 10, padding: 12 },
  historyText: { flex: 1, fontSize: 12 },
  identityBlock: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  identityText: { flex: 1, gap: 1 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  primaryAction: { flex: 1.15 },
  receiptCard: { ...shadow, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 18, overflow: 'hidden', padding: 20 },
  receiptFooter: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, marginHorizontal: -4, padding: 13 },
  receiptLabel: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  receiptNumber: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', maxWidth: '100%', textAlign: 'center' },
  savedNote: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 6 },
  savedText: { color: colors.success, fontSize: 12 },
  screen: { gap: 14 },
  secondaryAction: { flex: 0.85 },
  section: { gap: 11 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  statusBand: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.successSoft, borderRadius: radius.pill, flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingVertical: 7 },
  statusBandVoid: { backgroundColor: colors.dangerSoft },
  statusText: { color: colors.success, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  statusTextVoid: { color: colors.danger },
  tenantName: { fontSize: 17, fontWeight: '700' },
  thinRule: { backgroundColor: colors.border, height: 1 },
  voidNotice: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12 },
  voidText: { color: colors.danger },
  voidTitle: { color: colors.danger, fontWeight: '800' },
});
