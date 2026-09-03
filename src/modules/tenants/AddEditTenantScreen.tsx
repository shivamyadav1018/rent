import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { unitRepo } from '../../database/repositories/unitRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { colors, radius } from '../../theme';
import { formatCurrency } from '../../utils/currency';

const schema = z.object({
  dueDay: z.coerce.number().int().min(1).max(31),
  monthlyRent: z.coerce.number().positive(),
  moveInDate: z.string().min(10),
  name: z.string().trim().min(1, 'Tenant name is required'),
  notes: z.string(),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  securityDeposit: z.coerce.number().min(0),
  unitId: z.string().min(1, 'Select a unit'),
});
type FormData = { dueDay: string; monthlyRent: string; moveInDate: string; name: string; notes: string; phone: string; securityDeposit: string; unitId: string };

export function AddEditTenantScreen({ navigation, route }: any) {
  const tenantId = route.params?.tenantId as string | undefined;
  const initialUnitId = route.params?.unitId as string | undefined;
  const properties = useAppStore(state => state.properties);
  const units = useAppStore(state => state.units);
  const refreshAll = useAppStore(state => state.refreshAll);
  const [isRefreshingUnits, setIsRefreshingUnits] = useState(units.length === 0);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { dueDay: '5', monthlyRent: '', moveInDate: new Date().toISOString().slice(0, 10), name: '', notes: '', phone: '', securityDeposit: '0', unitId: initialUnitId ?? '' },
  });
  const unitId = watch('unitId');
  // Show: (a) vacant units OR (b) the tenant's own current unit (even if marked occupied)
  // This prevents showing units occupied by OTHER tenants
  const availableUnits = useMemo(
    () => units.filter(unit => unit.status === 'vacant' || unit.id === unitId),
    [unitId, units],
  );

  useFocusEffect(useCallback(() => {
    let isActive = true;
    setIsRefreshingUnits(true);
    refreshAll()
      .catch(() => undefined)
      .finally(() => { if (isActive) setIsRefreshingUnits(false); });
    return () => { isActive = false; };
  }, [refreshAll]));
  useEffect(() => {
    if (!tenantId) return;
    tenantRepo.find(tenantId).then(tenant => {
      if (tenant) reset({ dueDay: String(tenant.due_day), monthlyRent: String(tenant.monthly_rent), moveInDate: tenant.move_in_date.slice(0, 10), name: tenant.name, notes: tenant.notes ?? '', phone: tenant.phone, securityDeposit: String(tenant.security_deposit), unitId: tenant.unit_id });
    });
  }, [reset, tenantId]);

  const chooseUnit = async (id: string) => {
    setValue('unitId', id, { shouldValidate: true });
    const unit = await unitRepo.find(id);
    if (unit) setValue('monthlyRent', String(unit.monthly_rent));
  };

  const openUnitSetup = () => {
    if (properties.length === 0) {
      navigation.navigate('AddProperty');
    } else if (properties.length === 1) {
      navigation.navigate('AddUnit', { propertyId: properties[0].id });
    } else {
      navigation.navigate('MainTabs', { screen: 'Properties' });
    }
  };

  const save = handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return Alert.alert('Check the form', parsed.error.issues[0]?.message ?? 'Invalid values');
    try {
      const id = await tenantRepo.save({
        due_day: parsed.data.dueDay, id: tenantId, monthly_rent: parsed.data.monthlyRent,
        move_in_date: parsed.data.moveInDate, // stored as plain YYYY-MM-DD, no UTC conversion
        name: parsed.data.name,
        notes: parsed.data.notes, phone: parsed.data.phone, security_deposit: parsed.data.securityDeposit,
        unit_id: parsed.data.unitId,
      });
      await rentCycleService.ensureCurrentCycleForTenant(id);
      await refreshAll();
      navigation.replace('TenantDetail', { tenantId: id });
    } catch (error) {
      Alert.alert('Could not save tenant', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <Screen>
      <Title>{tenantId ? 'Edit tenant' : 'New tenant'}</Title>
      <Controller control={control} name="name" render={({ field }) => <AppInput label="Tenant name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="phone" render={({ field }) => <AppInput label="Phone number" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />} />
      <Body style={styles.label}>Property / unit</Body>
      {isRefreshingUnits && units.length === 0 ? (
        <View style={styles.loadingUnits}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Muted>Loading available units...</Muted>
        </View>
      ) : availableUnits.length > 0 ? (
        <View style={styles.units}>
          {availableUnits.map(unit => {
            const selected = unitId === unit.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={unit.id}
                onPress={() => chooseUnit(unit.id)}
                style={({ pressed }) => [styles.unitOption, selected && styles.unitOptionSelected, pressed && styles.unitOptionPressed]}>
                <View style={[styles.unitIcon, selected && styles.unitIconSelected]}>
                  <AppIcon color={selected ? colors.surface : colors.primary} name="door-open" size={20} />
                </View>
                <View style={styles.unitInfo}>
                  <Muted numberOfLines={1} style={styles.propertyName}>{unit.property_name}</Muted>
                  <Body numberOfLines={1} style={styles.unitName}>{unit.name}</Body>
                  <Muted>{formatCurrency(unit.monthly_rent)} / month</Muted>
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
      ) : (
        <View style={styles.emptyUnits}>
          <View style={styles.emptyUnitIcon}>
            <AppIcon color={colors.primary} name="home-plus-outline" size={24} />
          </View>
          <Body style={styles.emptyUnitTitle}>{units.length === 0 ? 'No units created yet' : 'No vacant units available'}</Body>
          <Muted style={styles.emptyUnitMessage}>
            {properties.length === 0
              ? 'Create a property first, then add a unit for this tenant.'
              : units.length === 0
                ? 'Add a unit before assigning this tenant.'
                : 'Every unit already has a tenant. Add another unit to continue.'}
          </Muted>
          <AppButton
            title={properties.length === 0 ? 'Add property' : properties.length === 1 ? 'Add unit' : 'View properties'}
            onPress={openUnitSetup}
            variant="secondary"
          />
        </View>
      )}
      {errors.unitId?.message ? <Muted style={styles.error}>{errors.unitId.message}</Muted> : null}
      <Controller control={control} name="monthlyRent" render={({ field }) => <AppInput label="Monthly rent" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="dueDay" render={({ field }) => <AppInput label="Due day (1-31)" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="moveInDate" render={({ field }) => <AppInput label="Move-in date (YYYY-MM-DD)" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="securityDeposit" render={({ field }) => <AppInput label="Security deposit" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="notes" render={({ field }) => <AppInput label="Notes (optional)" value={field.value} onChangeText={field.onChange} multiline />} />
      <AppButton disabled={isSubmitting} title={isSubmitting ? 'Saving...' : 'Save tenant'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyUnitIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyUnitMessage: { textAlign: 'center' },
  emptyUnitTitle: { fontWeight: '700', marginTop: 2 },
  emptyUnits: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  error: { color: colors.danger },
  label: { fontSize: 13, fontWeight: '600' },
  loadingUnits: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  propertyName: { fontSize: 12 },
  unitIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  unitIconSelected: { backgroundColor: colors.primary },
  unitInfo: { flex: 1 },
  unitName: { fontWeight: '700' },
  unitOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  unitOptionPressed: { opacity: 0.75 },
  unitOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
    padding: 11,
  },
  units: { gap: 8 },
});
