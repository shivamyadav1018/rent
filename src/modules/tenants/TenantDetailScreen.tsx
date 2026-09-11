import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { paymentRepo } from '../../database/repositories/paymentRepo';
import { rentRepo } from '../../database/repositories/rentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { idProofService } from '../../services/idProofService';
import { Payment, RentCycle, Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel } from '../../utils/dates';
import { colors } from '../../theme';

type TenantDetail = Tenant & { unit_name: string; property_name: string };
type HistoryPayment = Payment & { month: number; year: number };

export function TenantDetailScreen({ navigation, route }: any) {
  const tenantId = route.params.tenantId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [payments, setPayments] = useState<HistoryPayment[]>([]);
  const [electricityDraft, setElectricityDraft] = useState('0');
  const [savingBill, setSavingBill] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      setError('');
      const load = async () => {
        try {
          const nextTenant = await tenantRepo.find(tenantId);
          if (!isActive) return;
          setTenant(nextTenant);
          const now = new Date();
          // Inactive tenants may have an existing final cycle, but must never get
          // a new rent cycle simply because their details screen was opened.
          const cyclePromise =
            nextTenant?.status === 'active'
              ? rentCycleService.ensureCurrentCycleForTenant(tenantId)
              : rentRepo.findCycle(
                  tenantId,
                  now.getMonth() + 1,
                  now.getFullYear(),
                );
          const [nextCycle, nextPayments] = await Promise.all([
            cyclePromise,
            paymentRepo.forTenant(tenantId),
          ]);
          if (!isActive) return;
          setCycle(nextCycle?.deleted_at ? null : nextCycle);
          if (nextCycle && !nextCycle.deleted_at)
            setElectricityDraft(String(nextCycle.electricity_amount ?? 0));
          setPayments(nextPayments);
        } catch {
          if (!isActive) return;
          setCycle(null);
          setPayments([]);
          setError(
            'Could not load tenant details. Reopen this tenant to retry.',
          );
        } finally {
          if (isActive) setLoading(false);
        }
      };
      load();
      return () => {
        isActive = false;
      };
    }, [tenantId]),
  );

  if (loading)
    return (
      <Screen>
        <Muted>Loading tenant...</Muted>
      </Screen>
    );
  if (error || !tenant)
    return (
      <Screen>
        <Muted>{error || 'Tenant not found.'}</Muted>
        <AppButton title="Go back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  const updateElectricity = async () => {
    if (!cycle || savingBill) return;
    const amount = Number(electricityDraft);
    if (!Number.isFinite(amount) || amount < 0)
      return Alert.alert(
        'Check electricity',
        'Enter an amount of zero or more.',
      );
    setSavingBill(true);
    try {
      const updated = await rentCycleService.updateElectricity(
        tenantId,
        cycle.month,
        cycle.year,
        amount,
      );
      setCycle(updated);
      Alert.alert(
        'Bill updated',
        `Total payable is now ${formatCurrency(updated.total_payable)}.`,
      );
    } catch (updateError) {
      Alert.alert(
        'Could not update bill',
        updateError instanceof Error
          ? updateError.message
          : 'Please try again.',
      );
    } finally {
      setSavingBill(false);
    }
  };
  return (
    <Screen>
      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <Title>{tenant.name}</Title>
          <View style={styles.inlineInfo}>
            <AppIcon color={colors.muted} name="home-outline" size={16} />
            <Muted>
              {tenant.property_name} · {tenant.unit_name}
            </Muted>
          </View>
        </View>
        {tenant.status === 'inactive' ? <StatusBadge status="vacant" /> : null}
      </View>
      <Card>
        <View style={styles.contactRow}>
          <View style={styles.iconTile}>
            <AppIcon color={colors.primary} name="phone-outline" size={20} />
          </View>
          <View style={styles.titleInfo}>
            <Muted>Mobile number</Muted>
            <Body style={styles.strong}>{tenant.phone}</Body>
          </View>
        </View>
        <View style={styles.summaryPanel}>
          <View style={styles.summaryItem}>
            <Muted>Monthly total</Muted>
            <Body style={styles.summaryValue}>
              {formatCurrency(tenant.monthly_rent + tenant.electricity_amount)}
            </Body>
            <Muted>
              Rent {formatCurrency(tenant.monthly_rent)} + power{' '}
              {formatCurrency(tenant.electricity_amount)}
            </Muted>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Muted>Rent due</Muted>
            <Body style={styles.summaryValue}>Day {tenant.due_day}</Body>
            <Muted>of every month</Muted>
          </View>
        </View>
        <View style={styles.detailGrid}>
          <View style={styles.inlineInfo}>
            <AppIcon
              color={colors.muted}
              name="calendar-check-outline"
              size={16}
            />
            <Muted>Moved in {displayDate(tenant.move_in_date)}</Muted>
          </View>
          <View style={styles.inlineInfo}>
            <AppIcon
              color={colors.muted}
              name="shield-check-outline"
              size={16}
            />
            <Muted>Deposit {formatCurrency(tenant.security_deposit)}</Muted>
          </View>
        </View>
        {tenant.id_proof_storage_path ? (
          <AppButton
            icon={
              <AppIcon
                color={colors.primaryDark}
                name="file-eye-outline"
                size={18}
              />
            }
            size="compact"
            title={`View ID proof${
              tenant.id_proof_name ? ` · ${tenant.id_proof_name}` : ''
            }`}
            variant="secondary"
            onPress={() =>
              idProofService
                .open(tenant.id_proof_storage_path as string)
                .catch(() =>
                  Alert.alert(
                    'Could not open ID proof',
                    'Check your connection and Firebase Storage access.',
                  ),
                )
            }
          />
        ) : null}
        {tenant.notes ? <Muted>{tenant.notes}</Muted> : null}
      </Card>
      <View style={styles.actions}>
        {tenant.status === 'active' ? (
          <AppButton
            icon={<AppIcon color={colors.surface} name="cash-plus" size={18} />}
            size="compact"
            style={styles.actionButton}
            title="Record payment"
            onPress={() =>
              navigation.navigate('RecordPayment', {
                tenantId,
                cycleId: cycle?.id,
              })
            }
          />
        ) : null}
        {tenant.status === 'active' && cycle && cycle.balance > 0 ? (
          <AppButton
            icon={
              <AppIcon
                color={colors.primaryDark}
                name="bell-outline"
                size={18}
              />
            }
            size="compact"
            style={styles.actionButton}
            title="Send reminder"
            variant="secondary"
            onPress={() =>
              navigation.navigate('ReminderPreview', { cycleId: cycle.id })
            }
          />
        ) : null}
        <AppButton
          icon={
            <AppIcon
              color={colors.primaryDark}
              name="pencil-outline"
              size={18}
            />
          }
          size="compact"
          style={styles.actionButton}
          title="Edit tenant"
          variant="secondary"
          onPress={() => navigation.navigate('AddTenant', { tenantId })}
        />
        {tenant.status === 'active' ? (
          <AppButton
            icon={
              <AppIcon color={colors.danger} name="exit-to-app" size={18} />
            }
            size="compact"
            style={styles.actionButton}
            title="Move out"
            variant="danger"
            onPress={() =>
              Alert.alert(
                'Mark as moved out?',
                `This will mark ${tenant.name} as inactive and free their unit. This cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Move out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await tenantRepo.deactivate(tenantId);
                        navigation.goBack();
                      } catch {
                        Alert.alert(
                          'Could not move out tenant',
                          'Please try again.',
                        );
                      }
                    },
                  },
                ],
              )
            }
          />
        ) : null}
      </View>
      <Body style={styles.heading}>Current rent</Body>
      {cycle ? (
        <Card>
          <View style={styles.currentHeader}>
            <View>
              <Muted>Total payable</Muted>
              <Body style={styles.total}>
                {formatCurrency(cycle.total_payable)}
              </Body>
            </View>
            <StatusBadge status={cycle.status} />
          </View>
          <Muted>
            Rent {formatCurrency(cycle.rent_amount)} + Electricity{' '}
            {formatCurrency(cycle.electricity_amount)}
          </Muted>
          <View style={styles.paymentProgress}>
            <View style={styles.summaryItem}>
              <Muted>Paid</Muted>
              <Body style={styles.paid}>
                {formatCurrency(cycle.total_paid)}
              </Body>
            </View>
            <View style={styles.summaryItem}>
              <Muted>Remaining</Muted>
              <Body style={cycle.balance > 0 ? styles.remaining : styles.paid}>
                {formatCurrency(cycle.balance)}
              </Body>
            </View>
          </View>
          {tenant.status === 'active' ? (
            <>
              <AppInput
                editable={!savingBill}
                icon="flash-outline"
                label="Electricity for this month"
                keyboardType="numeric"
                value={electricityDraft}
                onChangeText={setElectricityDraft}
              />
              <AppButton
                disabled={savingBill}
                icon={
                  <AppIcon
                    color={colors.primaryDark}
                    name="refresh"
                    size={18}
                  />
                }
                size="compact"
                title={savingBill ? 'Updating...' : 'Update electricity'}
                variant="secondary"
                onPress={updateElectricity}
              />
            </>
          ) : null}
        </Card>
      ) : (
        <Muted>No cycle available.</Muted>
      )}
      <Body style={styles.heading}>Payment history</Body>
      {payments.length === 0 ? (
        <Muted>No payments recorded.</Muted>
      ) : (
        payments.map(payment => (
          <Card key={payment.id}>
            <View style={styles.paymentHistoryRow}>
              <View style={styles.iconTile}>
                <AppIcon color={colors.success} name="check" size={20} />
              </View>
              <View style={styles.titleInfo}>
                <Body style={styles.strong}>
                  {formatCurrency(payment.amount)}
                </Body>
                <Muted>
                  {monthLabel(payment.month, payment.year)} ·{' '}
                  {displayDate(payment.payment_date)} ·{' '}
                  {payment.payment_mode.replace('_', ' ')}
                </Muted>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: { flexBasis: '48%', flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contactRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  currentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heading: { fontWeight: '800', marginTop: 4 },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  inlineInfo: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  paid: { color: colors.success, fontWeight: '700' },
  paymentHistoryRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  paymentProgress: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  remaining: { color: colors.danger, fontWeight: '700' },
  strong: { fontWeight: '700' },
  summaryDivider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    width: 1,
  },
  summaryItem: { flex: 1, gap: 2 },
  summaryPanel: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  summaryValue: { fontSize: 17, fontWeight: '800' },
  titleInfo: { flex: 1, gap: 3 },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  total: { fontSize: 18, fontWeight: '800' },
});
