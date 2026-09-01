import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Title } from '../../components/Typography';
import { unitRepo } from '../../database/repositories/unitRepo';
import { useAppStore } from '../../store/appStore';
import { UnitStatus } from '../../types/models';
import { colors, fontFamily } from '../../theme';

const schema = z.object({ name: z.string().trim().min(1, 'Unit name is required'), monthlyRent: z.coerce.number().min(0), status: z.enum(['vacant', 'occupied']) });
type FormData = { name: string; monthlyRent: string; status: UnitStatus };

export function AddEditUnitScreen({ navigation, route }: any) {
  const { propertyId, unitId } = route.params as { propertyId: string; unitId?: string };
  const refreshAll = useAppStore(state => state.refreshAll);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ defaultValues: { monthlyRent: '', name: '', status: 'vacant' } });
  const status = watch('status');

  useEffect(() => {
    if (!unitId) return;
    unitRepo.find(unitId).then(unit => { if (unit) reset({ monthlyRent: String(unit.monthly_rent), name: unit.name, status: unit.status }); });
  }, [reset, unitId]);

  const save = handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return Alert.alert('Check the form', parsed.error.issues[0]?.message ?? 'Invalid values');
    await unitRepo.save({ id: unitId, monthly_rent: parsed.data.monthlyRent, name: parsed.data.name, property_id: propertyId, status: parsed.data.status });
    await refreshAll();
    navigation.goBack();
  });

  return (
    <Screen>
      <Title>{unitId ? 'Edit unit' : 'New unit'}</Title>
      <Controller control={control} name="name" render={({ field }) => <AppInput label="Unit name" placeholder="Room 1" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="monthlyRent" render={({ field }) => <AppInput label="Monthly rent" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Text style={styles.label}>Status</Text>
      <View style={styles.options}>{(['vacant', 'occupied'] as UnitStatus[]).map(item => <Pressable key={item} onPress={() => setValue('status', item)} style={[styles.option, status === item && styles.selected]}><Text style={status === item ? styles.selectedText : styles.optionText}>{item}</Text></Pressable>)}</View>
      <AppButton title={isSubmitting ? 'Saving...' : 'Save unit'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({ label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' }, option: { backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }, optionText: { color: colors.ink, fontFamily, textTransform: 'capitalize' }, options: { flexDirection: 'row', gap: 8 }, selected: { backgroundColor: colors.primary }, selectedText: { color: colors.surface, fontFamily, fontWeight: '700', textTransform: 'capitalize' } });
