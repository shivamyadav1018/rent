import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { useAppStore } from '../../store/appStore';
import { PropertyType } from '../../types/models';
import { colors, fontFamily } from '../../theme';

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
      <Text style={styles.label}>Property type</Text>
      <View style={styles.options}>
        {types.map(type => <Pressable key={type} onPress={() => setValue('type', type)} style={[styles.option, selectedType === type && styles.selected]}><Text style={selectedType === type ? styles.selectedText : styles.optionText}>{type}</Text></Pressable>)}
      </View>
      <Controller control={control} name="address" render={({ field }) => <AppInput label="Address (optional)" value={field.value} onChangeText={field.onChange} multiline />} />
      <AppButton title={isSubmitting ? 'Saving...' : 'Save property'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600' },
  option: { backgroundColor: colors.surfaceMuted, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  optionText: { color: colors.ink, fontFamily, textTransform: 'capitalize' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selected: { backgroundColor: colors.primary },
  selectedText: { color: colors.surface, fontFamily, fontWeight: '700', textTransform: 'capitalize' },
});
