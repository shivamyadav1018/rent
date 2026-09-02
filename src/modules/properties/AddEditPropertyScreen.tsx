import React, { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { useAppStore } from '../../store/appStore';
import { PropertyType } from '../../types/models';

const schema = z.object({ name: z.string().trim().min(1, 'Property name is required'), address: z.string(), type: z.enum(['house', 'flat', 'room', 'shop', 'PG']) });
type FormData = z.infer<typeof schema>;
const types: PropertyType[] = ['house', 'flat', 'room', 'shop', 'PG'];

export function AddEditPropertyScreen({ navigation, route }: any) {
  const propertyId = route.params?.propertyId as string | undefined;
  const refreshAll = useAppStore(state => state.refreshAll);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { address: '', name: '', type: 'house' },
  });
  const selectedType = watch('type');

  useEffect(() => {
    if (!propertyId) return;
    propertyRepo.find(propertyId).then(property => {
      if (property) reset({ address: property.address ?? '', name: property.name, type: property.type });
    });
  }, [propertyId, reset]);

  const save = handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return;
    try {
      const id = await propertyRepo.save({ ...parsed.data, id: propertyId });
      await refreshAll();
      if (propertyId) navigation.goBack();
      else navigation.replace('PropertyDetail', { propertyId: id });
    } catch (error) {
      Alert.alert('Could not save property', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <Screen>
      <Title>{propertyId ? 'Edit property' : 'New property'}</Title>
      <Controller control={control} name="name" render={({ field }) => <AppInput label="Property name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Body style={styles.label}>Property type</Body>
      <View style={styles.options}>
        {types.map(type => <AppChip key={type} label={type} selected={selectedType === type} onPress={() => setValue('type', type)} />)}
      </View>
      <Controller control={control} name="address" render={({ field }) => <AppInput label="Address (optional)" value={field.value} onChangeText={field.onChange} multiline />} />
      <AppButton title={isSubmitting ? 'Saving...' : 'Save property'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
