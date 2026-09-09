import { ResourceState } from '../../components/ResourceState';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { Card } from '../../components/Card';
import { FormSection, FormStep, InfoNote } from '../../components/FormSection';
import { colors } from '../../theme';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { useAppStore } from '../../store/appStore';
import { PropertyType } from '../../types/models';

const schema = z.object({
  name: z.string().trim().min(1, 'Property name is required'),
  address: z.string(),
  type: z.enum(['house', 'flat', 'room', 'shop', 'PG']),
});
type FormData = z.infer<typeof schema>;
const types: {
  value: PropertyType;
  label: string;
  detail: string;
  icon: string;
}[] = [
  {
    value: 'flat',
    label: 'Apartment / Flat',
    detail: 'Multi-floor residential',
    icon: 'office-building-outline',
  },
  {
    value: 'house',
    label: 'House / Villa',
    detail: 'Independent home',
    icon: 'home-city-outline',
  },
  {
    value: 'shop',
    label: 'Commercial / Shop',
    detail: 'Retail, office, warehouse',
    icon: 'storefront-outline',
  },
  {
    value: 'PG',
    label: 'PG / Co-living',
    detail: 'Shared accommodation',
    icon: 'bed-outline',
  },
  {
    value: 'room',
    label: 'Room',
    detail: 'Individual rental room',
    icon: 'door-open',
  },
];

export function AddEditPropertyScreen({ navigation, route }: any) {
  const propertyId = route.params?.propertyId as string | undefined;
  const refreshAll = useAppStore(state => state.refreshAll);
  const [loadingRecord, setLoadingRecord] = useState(Boolean(propertyId));
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { address: '', name: '', type: 'house' },
  });
  const selectedType = watch('type');

  useEffect(() => {
    if (!propertyId) return;
    let isActive = true;
    setLoadingRecord(true);
    setLoadError('');
    propertyRepo
      .find(propertyId)
      .then(property => {
        if (!isActive) return;
        if (!property) throw new Error('Property not found.');
        if (isActive && property)
          reset({
            address: property.address ?? '',
            name: property.name,
            type: property.type,
          });
      })
      .catch(() => {
        if (isActive)
          setLoadError(
            'Could not load property. Please retry or return to the list.',
          );
      })
      .finally(() => {
        if (isActive) setLoadingRecord(false);
      });
    return () => {
      isActive = false;
    };
  }, [propertyId, reset, loadAttempt]);

  const save = handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success)
      return Alert.alert(
        'Check the form',
        parsed.error.issues[0]?.message ?? 'Invalid values',
      );
    try {
      const id = await propertyRepo.save({ ...parsed.data, id: propertyId });
      await refreshAll().catch(() => undefined);
      if (propertyId) navigation.goBack();
      else navigation.replace('PropertyDetail', { propertyId: id });
    } catch (error) {
      Alert.alert(
        'Could not save property',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  });

  if (loadingRecord || loadError)
    return (
      <ResourceState
        loading={loadingRecord}
        error={loadError}
        label="property"
        retry={() => setLoadAttempt(value => value + 1)}
      />
    );

  return (
    <Screen>
      <FormStep
        title={
          propertyId ? 'PROPERTY PROFILE' : 'STEP 1 OF 2 • PROPERTY PROFILE'
        }
        detail={propertyId ? 'Edit details' : 'Next: setup units'}
      />
      <Card>
        <Title style={styles.title}>
          {propertyId ? 'Update Your Property' : 'New Real Estate Asset'}
        </Title>
        <Muted>
          Add a residential building, commercial shop, or PG to track your
          khata.
        </Muted>
      </Card>
      <Body style={styles.label}>Property Category</Body>
      <View style={styles.options}>
        {types.map(type => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedType === type.value }}
            key={type.value}
            onPress={() => setValue('type', type.value)}
            style={[
              styles.category,
              selectedType === type.value && styles.selected,
            ]}
          >
            <View style={styles.categoryTop}>
              <AppIcon name={type.icon} color={colors.primaryDark} size={24} />
              {selectedType === type.value ? (
                <AppIcon
                  name="check-circle-outline"
                  color={colors.primaryDark}
                  size={17}
                />
              ) : null}
            </View>
            <Body style={styles.categoryLabel}>{type.label}</Body>
            <Muted style={styles.caption}>{type.detail}</Muted>
          </Pressable>
        ))}
      </View>
      <FormSection icon="map-marker-outline" title="Identity & Location">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <AppInput
              icon="office-building-outline"
              label="Building / Property Name *"
              placeholder="e.g. Sai Krupa Enclave"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <AppInput
              icon="map-marker-outline"
              label="Street & Area Address (optional)"
              placeholder="Street, area, city and pincode"
              value={field.value}
              onChangeText={field.onChange}
              multiline
            />
          )}
        />
      </FormSection>
      <FormSection
        icon="floor-plan"
        title="Units Configuration"
        subtitle="Rooms, flats or shops inside this property"
      >
        <Muted>
          {propertyId
            ? 'Manage unit names, rent and occupancy from the property details screen.'
            : 'Save this property to add individual units, set their monthly rent and assign tenants.'}
        </Muted>
      </FormSection>
      <InfoNote>
        Set each tenant’s monthly electricity amount when adding their rental
        agreement.
      </InfoNote>
      <View style={styles.actions}>
        <AppButton
          style={styles.cancel}
          title="Cancel"
          variant="secondary"
          disabled={isSubmitting}
          onPress={() => navigation.goBack()}
        />
        <AppButton
          style={styles.save}
          disabled={isSubmitting}
          title={
            isSubmitting
              ? 'Saving...'
              : propertyId
              ? 'Save property'
              : 'Save & Setup Units  →'
          }
          onPress={save}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 28 },
  label: { fontSize: 15, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface,
    gap: 6,
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.lavender,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryLabel: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 10, lineHeight: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  cancel: { flex: 1 },
  save: { flex: 2 },
});
