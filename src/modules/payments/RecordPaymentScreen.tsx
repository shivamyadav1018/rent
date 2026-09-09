import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { MonthSelector } from '../../components/MonthSelector';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { colors, radius } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { monthLabel } from '../../utils/dates';

import { paymentModes, useRecordPayment } from './useRecordPayment';

export function RecordPaymentScreen({ navigation, route }: any) {
  const {
    activeTenants, loadingTenants, tenantError, retryTenants, tenantId, selectTenant,
    cycle, month, year, changeMonth, amount, setAmount, electricityAmount, setElectricityAmount, paymentDate, setPaymentDate,
    mode, selectMode, referenceNo, setReferenceNo, notes, setNotes, saving,
    selectionReady, loadingCycle, cycleError, retryCycle, savedCycleId, save,
  } = useRecordPayment(route.params);

  if (savedCycleId) return (
    <Screen>
      <Title>Payment saved</Title>
      <Card><Body>{formatCurrency(Number(amount))} recorded</Body><Muted>{monthLabel(month, year)} | {mode.replace('_', ' ')}</Muted></Card>
      <AppButton title="Generate / share receipt" onPress={() => navigation.navigate('ReceiptPreview', { amountPaid: Number(amount), cycleId: savedCycleId, notes, paymentDate, paymentMode: mode, referenceNo })} />
      <AppButton title="Back to dashboard" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })} />
    </Screen>
  );

  return (
    <Screen>
      <Title>Record payment</Title>
      <Body style={styles.label}>Tenant</Body>
      {tenantError ? <View><Muted>{tenantError}</Muted><AppButton title="Retry tenants" onPress={retryTenants} /></View> : null}
      {loadingTenants && activeTenants.length === 0 ? (
        <View style={styles.loadingTenants}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Muted>Loading active tenants...</Muted>
        </View>
      ) : activeTenants.length > 0 ? (
        <View style={styles.tenantOptions}>
          {activeTenants.map(tenant => {
            const selected = tenantId === tenant.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={tenant.id}
                onPress={() => selectTenant(tenant.id)}
                style={({ pressed }) => [styles.tenantOption, selected && styles.tenantOptionSelected, pressed && styles.optionPressed]}>
                <View style={[styles.tenantIcon, selected && styles.tenantIconSelected]}>
                  <AppIcon color={selected ? colors.surface : colors.primary} name="account-outline" size={21} />
                </View>
                <View style={styles.tenantInfo}>
                  <Body numberOfLines={1} style={styles.tenantName}>{tenant.name}</Body>
                  <Muted numberOfLines={1}>
                    {[tenant.property_name, tenant.unit_name].filter(Boolean).join(' / ') || tenant.phone}
                  </Muted>
                </View>
                <AppIcon
                  color={selected ? colors.primary : colors.muted}
                  name={selected ? 'check-circle' : 'circle-outline'}
                  size={22}
                />
              </Pressable>
            );
          })}
        </View>
      ) : !tenantError ? (
        <View style={styles.emptyTenants}>
          <View style={styles.emptyTenantIcon}>
            <AppIcon color={colors.primary} name="account-plus-outline" size={24} />
          </View>
          <Body style={styles.emptyTenantTitle}>No active tenants</Body>
          <Muted style={styles.emptyTenantMessage}>Add a tenant before recording a payment.</Muted>
          <AppButton title="Add tenant" variant="secondary" onPress={() => navigation.navigate('AddTenant')} />
        </View>
      ) : null}
      <MonthSelector month={month} year={year} onChange={changeMonth} disabled={saving || !selectionReady} />
      {loadingCycle ? <Muted>Loading rent balance...</Muted> : null}
      {cycleError ? <View><Muted>{cycleError}</Muted><AppButton title="Retry" variant="secondary" onPress={retryCycle} /></View> : null}
      {cycle ? (
        <Card>
          <Body>{`Rent ${formatCurrency(cycle.rent_amount)} + Electricity ${formatCurrency(Number(electricityAmount) || 0)}`}</Body>
          <Body style={styles.payable}>{`Total payable ${formatCurrency(cycle.rent_amount + (Number(electricityAmount) || 0))}`}</Body>
          <Muted>Already paid {formatCurrency(cycle.total_paid)} | Balance after bill update {formatCurrency(cycle.rent_amount + (Number(electricityAmount) || 0) - cycle.total_paid)}</Muted>
        </Card>
      ) : null}
      <AppInput editable={!saving} label="Electricity for this month" keyboardType="numeric" value={electricityAmount} onChangeText={setElectricityAmount} />
      <AppInput editable={!saving} label="Amount received" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <AppInput editable={!saving} label="Payment date (YYYY-MM-DD)" value={paymentDate} onChangeText={setPaymentDate} />
      <Body style={styles.label}>Payment mode</Body>
      <View style={styles.options}>{paymentModes.map(item => <AppChip key={item} label={item.replace('_', ' ')} selected={mode === item} onPress={() => selectMode(item)} />)}</View>
      <AppInput editable={!saving} label="Reference number (optional)" value={referenceNo} onChangeText={setReferenceNo} />
      <AppInput editable={!saving} label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <AppButton disabled={saving || loadingCycle || !cycle || !selectionReady} title={saving ? 'Saving...' : 'Save payment'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTenantIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyTenantMessage: { textAlign: 'center' },
  emptyTenantTitle: { fontWeight: '700', marginTop: 2 },
  emptyTenants: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  label: { fontSize: 13, fontWeight: '600' },
  loadingTenants: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  optionPressed: { opacity: 0.75 },
  payable: { fontWeight: '800' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenantIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tenantIconSelected: { backgroundColor: colors.primary },
  tenantInfo: { flex: 1 },
  tenantName: { fontWeight: '700' },
  tenantOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  tenantOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
    padding: 11,
  },
  tenantOptions: { gap: 8 },
});
