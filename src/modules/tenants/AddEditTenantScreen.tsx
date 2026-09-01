import React, { useEffect, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { unitRepo } from '../../database/repositories/unitRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { colors, fontFamily } from '../../theme';

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
  const units = useAppStore(state => state.units);
  const refreshAll = useAppStore(state => state.refreshAll);
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

  useEffect(() => { refreshAll(); }, [refreshAll]);
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
      {units.length === 0 ? <><Body>Create a property and unit first.</Body><AppButton title="Add property" onPress={() => navigation.navigate('AddProperty')} /></> : null}
      <Controller control={control} name="name" render={({ field }) => <AppInput label="Tenant name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="phone" render={({ field }) => <AppInput label="Phone number" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />} />
      <Text style={styles.label}>Property / unit</Text>
      <View style={styles.units}>{availableUnits.map(unit => <Pressable key={unit.id} onPress={() => chooseUnit(unit.id)} style={[styles.unit, unitId === unit.id && styles.selected]}><Text style={unitId === unit.id ? styles.selectedText : styles.unitText}>{unit.property_name} / {unit.name}</Text></Pressable>)}</View>
      {errors.unitId?.message ? <Muted style={styles.error}>{errors.unitId.message}</Muted> : null}
      <Controller control={control} name="monthlyRent" render={({ field }) => <AppInput label="Monthly rent" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="dueDay" render={({ field }) => <AppInput label="Due day (1-31)" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="moveInDate" render={({ field }) => <AppInput label="Move-in date (YYYY-MM-DD)" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="securityDeposit" render={({ field }) => <AppInput label="Security deposit" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="notes" render={({ field }) => <AppInput label="Notes (optional)" value={field.value} onChangeText={field.onChange} multiline />} />
      <AppButton title={isSubmitting ? 'Saving...' : 'Save tenant'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({ error: { color: colors.danger }, label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, selectedText: { color: colors.surface, fontFamily, fontWeight: '700' }, unit: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: 13 }, unitText: { color: colors.ink, fontFamily }, units: { gap: 8 } });
