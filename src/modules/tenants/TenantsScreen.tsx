import React, { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { BrandHeader, initials } from '../../components/BrandHeader';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme';

export function TenantsScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(false);
  const tenants = useAppStore(state => state.tenants);
  const ledger = useAppStore(state => state.dashboardLedger);
  const refreshAll = useAppStore(state => state.refreshAll);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshAll()
        .then(() => {
          if (active) setError(false);
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
      };
    }, [refreshAll]),
  );
  const cycleFor = (id: string) => ledger.find(item => item.tenant_id === id);
  const statusFor = (tenant: (typeof tenants)[number]) =>
    cycleFor(tenant.id)?.status ?? tenant.current_status ?? 'unpaid';
  const term = search.trim().toLowerCase();
  const matches = tenants.filter(tenant =>
    [tenant.name, tenant.phone, tenant.unit_name, tenant.property_name].some(
      value => value?.toLowerCase().includes(term),
    ),
  );
  const visible = matches.filter(
    tenant => filter === 'all' || statusFor(tenant) === filter,
  );
  return (
    <Screen
      header={
        <BrandHeader
          subtitle="Tenants"
          onProfile={() => navigation.navigate('Settings')}
        />
      }
    >
      <View style={styles.heading}>
        <View style={styles.info}>
          <Title>Tenants</Title>
          <Muted>
            {tenants.length} active tenants across{' '}
            {new Set(tenants.map(tenant => tenant.property_name)).size}{' '}
            properties
          </Muted>
        </View>
        <AppButton
          icon={
            <AppIcon
              color={colors.surface}
              name="account-plus-outline"
              size={19}
            />
          }
          title="Add Tenant"
          onPress={() => navigation.navigate('AddTenant')}
        />
      </View>
      <AppInput
        icon="magnify"
        label="Search tenants"
        placeholder="Search name, unit, property or phone"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {['all', 'paid', 'partial', 'overdue', 'unpaid'].map(status => (
          <AppChip
            key={status}
            label={`${status.toUpperCase()}  ${
              matches.filter(
                tenant => status === 'all' || statusFor(tenant) === status,
              ).length
            }`}
            selected={filter === status}
            onPress={() => setFilter(status)}
          />
        ))}
      </ScrollView>
      <InfoNote>
        Tap a tenant to view lease details, payment history and ledger.
      </InfoNote>
      {error ? (
        <>
          <Muted>
            Could not refresh tenants. Your last loaded records are shown.
          </Muted>
          <AppButton
            title="Retry"
            variant="secondary"
            onPress={() => {
              refreshAll()
                .then(() => setError(false))
                .catch(() => setError(true));
            }}
          />
        </>
      ) : null}
      {visible.length === 0 ? (
        <EmptyState
          message={
            tenants.length
              ? 'No tenants match this search or filter.'
              : 'Add your first tenant to start your khata.'
          }
        />
      ) : (
        visible.map(tenant => {
          const cycle = cycleFor(tenant.id);
          const status = statusFor(tenant);
          return (
            <Card key={tenant.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${tenant.name}`}
                style={styles.heading}
                onPress={() =>
                  navigation.navigate('TenantDetail', { tenantId: tenant.id })
                }
              >
                <View
                  style={[
                    styles.avatar,
                    status === 'overdue' && styles.overdueAvatar,
                  ]}
                >
                  <Body
                    style={[
                      styles.initials,
                      status === 'overdue' && styles.danger,
                    ]}
                  >
                    {initials(tenant.name)}
                  </Body>
                </View>
                <View style={styles.info}>
                  <Body style={styles.name}>{tenant.name}</Body>
                  <Muted>
                    {tenant.property_name} · {tenant.unit_name}
                  </Muted>
                </View>
                <StatusBadge status={status} />
              </Pressable>
              <View style={styles.rentRow}>
                <View>
                  <Muted>Monthly Rent</Muted>
                  <Body style={styles.rent}>
                    {formatCurrency(tenant.monthly_rent)}
                    <Muted> / month</Muted>
                  </Body>
                  {tenant.electricity_amount > 0 ? (
                    <Muted style={styles.small}>
                      + {formatCurrency(tenant.electricity_amount)} electricity
                    </Muted>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${tenant.name}`}
                  style={styles.phone}
                  onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                >
                  <AppIcon
                    color={colors.primaryDark}
                    name="phone-outline"
                    size={18}
                  />
                  <Body style={styles.phoneText}>{tenant.phone}</Body>
                </Pressable>
              </View>
              {cycle && status === 'paid' ? (
                <View style={styles.heading}>
                  <View style={styles.paid}>
                    <AppIcon
                      name="check-circle-outline"
                      color={colors.success}
                      size={19}
                    />
                    <Muted style={styles.success}>
                      Rent cleared for this month
                    </Muted>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('ReceiptPreview', {
                        cycleId: cycle.id,
                      })
                    }
                    style={styles.receipt}
                  >
                    <Body style={styles.receiptText}>RECEIPT</Body>
                  </Pressable>
                </View>
              ) : cycle && status === 'overdue' ? (
                <View style={styles.heading}>
                  <AppButton
                    style={styles.info}
                    title="Send WhatsApp Reminder"
                    variant="success"
                    textStyle={styles.reminderText}
                    icon={
                      <AppIcon
                        color={colors.success}
                        name="message-text-outline"
                        size={19}
                      />
                    }
                    onPress={() =>
                      navigation.navigate('ReminderPreview', {
                        cycleId: cycle.id,
                      })
                    }
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Record payment for ${tenant.name}`}
                    style={styles.collect}
                    onPress={() =>
                      navigation.navigate('RecordPayment', {
                        tenantId: tenant.id,
                        cycleId: cycle.id,
                      })
                    }
                  >
                    <AppIcon
                      name="currency-inr"
                      color={colors.primaryDark}
                      size={25}
                    />
                  </Pressable>
                </View>
              ) : (
                <AppButton
                  title={
                    cycle && cycle.balance > 0
                      ? `Collect ${formatCurrency(cycle.balance)}`
                      : 'Record Payment'
                  }
                  variant="secondary"
                  icon={
                    <AppIcon
                      name="credit-card-plus-outline"
                      color={colors.primaryDark}
                      size={21}
                    />
                  }
                  onPress={() =>
                    navigation.navigate('RecordPayment', {
                      tenantId: tenant.id,
                      ...(cycle ? { cycleId: cycle.id } : {}),
                    })
                  }
                />
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  filters: { gap: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueAvatar: { backgroundColor: colors.dangerSoft },
  initials: { color: colors.primaryDark, fontSize: 18, fontWeight: '600' },
  danger: { color: colors.danger },
  name: { fontWeight: '700', fontSize: 17 },
  rentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rent: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  phone: {
    backgroundColor: colors.primarySoft,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: { fontSize: 13, color: colors.primaryDark },
  small: { fontSize: 11 },
  paid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  success: { color: colors.success, fontSize: 12 },
  receipt: { minHeight: 44, justifyContent: 'center' },
  receiptText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  collect: {
    width: 48,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: { fontSize: 13 },
});
