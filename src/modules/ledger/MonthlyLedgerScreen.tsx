import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
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
import { colors } from '../../theme';

const statuses: Array<'all' | RentStatus> = [
  'all',
  'paid',
  'unpaid',
  'partial',
  'overdue',
];

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

  const load = useCallback(
    () => refreshLedger(month, year, status, propertyId),
    [month, propertyId, refreshLedger, status, year],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      load()
        .catch(() => {
          if (active) setLoadError('Could not load the ledger. Please retry.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const changeMonth = (amount: number) => {
    if (paymentInFlight.current) return;
    const next = new Date(year, month - 1 + amount, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const markPaid = async (tenantId: string, balance: number) => {
    if (balance <= 0 || paymentInFlight.current) return;
    paymentInFlight.current = true;
    setSaving(true);
    try {
      await rentCycleService.recordPayment({
        amount: balance,
        month,
        paymentDate: todayDate(),
        paymentMode: 'cash',
        tenantId,
        year,
      });
      Alert.alert('Payment recorded', 'The rent cycle is now paid.');
      await load().catch(() =>
        setLoadError(
          'Payment saved, but the ledger could not refresh. Please retry.',
        ),
      );
    } catch (error) {
      Alert.alert(
        'Could not record payment',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      paymentInFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Monthly ledger</Title>
      <MonthSelector
        month={month}
        year={year}
        onChange={changeMonth}
        disabled={saving}
      />
      <Body style={styles.label}>Status</Body>
      <View style={styles.filters}>
        {statuses.map(item => (
          <AppChip
            key={item}
            label={item}
            selected={status === item}
            onPress={() => {
              if (!paymentInFlight.current) setStatus(item);
            }}
          />
        ))}
      </View>
      <Body style={styles.label}>Property</Body>
      <View style={styles.filters}>
        <AppChip
          label="all"
          selected={!propertyId}
          onPress={() => {
            if (!paymentInFlight.current) setPropertyId(undefined);
          }}
        />
        {properties.map(property => (
          <AppChip
            key={property.id}
            label={property.name}
            selected={propertyId === property.id}
            onPress={() => {
              if (!paymentInFlight.current) setPropertyId(property.id);
            }}
          />
        ))}
      </View>
      {loading ? (
        <Muted>Loading ledger...</Muted>
      ) : loadError ? (
        <View style={styles.errorState}>
          <Muted>{loadError}</Muted>
          <AppButton
            icon={<AppIcon color={colors.surface} name="refresh" size={18} />}
            title="Retry"
            onPress={() => {
              setLoading(true);
              load()
                .then(() => setLoadError(''))
                .catch(() =>
                  setLoadError('Could not load the ledger. Please retry.'),
                )
                .finally(() => setLoading(false));
            }}
          />
        </View>
      ) : ledger.length === 0 ? (
        <Muted>No rent cycles match these filters.</Muted>
      ) : (
        ledger.map(item => (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <View style={styles.tenantInfo}>
                <Body style={styles.name}>{item.tenant_name}</Body>
                <View style={styles.metaRow}>
                  <AppIcon color={colors.muted} name="home-outline" size={15} />
                  <Muted style={styles.metaText}>
                    {item.property_name} · {item.unit_name}
                  </Muted>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.metaRow}>
              <AppIcon
                color={colors.muted}
                name="calendar-blank-outline"
                size={15}
              />
              <Muted style={styles.metaText}>
                Due {displayDate(item.due_date)}
              </Muted>
            </View>

            <View style={styles.amountPanel}>
              <View style={styles.amountColumn}>
                <Muted>Paid</Muted>
                <Body style={styles.paidAmount}>
                  {formatCurrency(item.total_paid)}
                </Body>
              </View>
              <View style={styles.amountDivider} />
              <View style={styles.amountColumn}>
                <Muted>Remaining</Muted>
                <Body
                  style={
                    item.balance > 0 ? styles.balanceAmount : styles.paidAmount
                  }
                >
                  {formatCurrency(item.balance)}
                </Body>
              </View>
            </View>
            <Muted style={styles.breakdown}>
              Rent {formatCurrency(item.rent_amount)} + Electricity{' '}
              {formatCurrency(item.electricity_amount)} ={' '}
              {formatCurrency(item.total_payable)}
            </Muted>

            <View style={styles.actions}>
              {item.balance > 0 ? (
                <View style={styles.actionRow}>
                  <AppButton
                    disabled={saving}
                    icon={
                      <AppIcon
                        color={colors.surface}
                        name="check-circle-outline"
                        size={18}
                      />
                    }
                    size="compact"
                    style={styles.actionButton}
                    title={saving ? 'Saving...' : 'Mark paid'}
                    onPress={() => markPaid(item.tenant_id, item.balance)}
                  />
                  <AppButton
                    disabled={saving}
                    icon={
                      <AppIcon
                        color={colors.primaryDark}
                        name="cash-plus"
                        size={18}
                      />
                    }
                    size="compact"
                    style={styles.actionButton}
                    title="Partial payment"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate('RecordPayment', {
                        tenantId: item.tenant_id,
                        cycleId: item.id,
                      })
                    }
                  />
                </View>
              ) : null}
              <View style={styles.actionRow}>
                {item.balance > 0 ? (
                  <AppButton
                    disabled={saving}
                    icon={
                      <AppIcon
                        color={colors.primaryDark}
                        name="bell-outline"
                        size={18}
                      />
                    }
                    size="compact"
                    style={styles.actionButton}
                    title="Reminder"
                    variant="secondary"
                    onPress={() =>
                      navigation.navigate('ReminderPreview', {
                        cycleId: item.id,
                      })
                    }
                  />
                ) : null}
                <AppButton
                  disabled={saving}
                  icon={
                    <AppIcon
                      color={colors.primaryDark}
                      name="account-details-outline"
                      size={18}
                    />
                  }
                  size="compact"
                  style={styles.actionButton}
                  title="Details"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('TenantDetail', {
                      tenantId: item.tenant_id,
                    })
                  }
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actions: { gap: 8, marginTop: 2 },
  amountColumn: { flex: 1, gap: 2 },
  amountDivider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    width: 1,
  },
  amountPanel: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  balanceAmount: { color: colors.danger, fontSize: 17, fontWeight: '700' },
  breakdown: { fontSize: 12 },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  errorState: { gap: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metaText: { flexShrink: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  paidAmount: { color: colors.success, fontSize: 17, fontWeight: '700' },
  tenantInfo: { flex: 1, gap: 4 },
});
