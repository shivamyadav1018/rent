import { ResourceState } from '../../components/ResourceState';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AppChip } from '../../components/AppChip';
import { FormSection, FormStep, InfoNote } from '../../components/FormSection';
import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { Screen } from '../../components/Screen';
import { Body, Muted } from '../../components/Typography';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { idProofService, type PickedIdProof } from '../../services/idProofService';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { isValidDate, todayDate } from '../../utils/dates';
import { formatCurrency } from '../../utils/currency';

const schema = z.object({
  dueDay: z.coerce.number().int().min(1).max(31),
  electricityAmount: z.coerce.number().min(0),
  monthlyRent: z.coerce.number().positive(),
  moveInDate: z.string().refine(isValidDate, 'Enter a valid move-in date (YYYY-MM-DD)'),
  name: z.string().trim().min(1, 'Tenant name is required'),
  notes: z.string(),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  securityDeposit: z.coerce.number().min(0),
  unitId: z.string().min(1, 'Select a unit'),
});
type FormData = { dueDay: string; electricityAmount: string; monthlyRent: string; moveInDate: string; name: string; notes: string; phone: string; securityDeposit: string; unitId: string };

export function AddEditTenantScreen({ navigation, route }: any) {
  const tenantId = route.params?.tenantId as string | undefined;
  const initialUnitId = route.params?.unitId as string | undefined;
  const properties = useAppStore(state => state.properties);
  const units = useAppStore(state => state.units);
  const refreshAll = useAppStore(state => state.refreshAll);
  const authStatus = useAuthStore(state => state.status);
  const [loadingRecord, setLoadingRecord] = useState(Boolean(tenantId));
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isRefreshingUnits, setIsRefreshingUnits] = useState(units.length === 0);
  const [pickedProof, setPickedProof] = useState<PickedIdProof | null>(null);
  const [existingProof, setExistingProof] = useState<{ mimeType: string | null; name: string; storagePath: string } | null>(null);
  const [removeExistingProof, setRemoveExistingProof] = useState(false);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { dueDay: '5', electricityAmount: '0', monthlyRent: '', moveInDate: todayDate(), name: '', notes: '', phone: '', securityDeposit: '0', unitId: initialUnitId ?? '' },
  });
  const unitId = watch('unitId');
  const dueDay = watch('dueDay');
  const [originalUnitId, setOriginalUnitId] = useState<string>();
  // Show: (a) vacant units OR (b) the tenant's own current unit (even if marked occupied)
  // This prevents showing units occupied by OTHER tenants
  const availableUnits = useMemo(
    () => units.filter(unit => unit.status === 'vacant' || unit.id === originalUnitId),
    [originalUnitId, units],
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
    let isActive = true;
    setLoadingRecord(true);
    setLoadError('');
    tenantRepo.find(tenantId).then(tenant => {
      if (!isActive) return;
      if (!tenant) throw new Error('Tenant not found.');
      if (isActive && tenant) {
        setOriginalUnitId(tenant.unit_id);
        reset({ dueDay: String(tenant.due_day), electricityAmount: String(tenant.electricity_amount), monthlyRent: String(tenant.monthly_rent), moveInDate: tenant.move_in_date.slice(0, 10), name: tenant.name, notes: tenant.notes ?? '', phone: tenant.phone, securityDeposit: String(tenant.security_deposit), unitId: tenant.unit_id });
        setExistingProof(tenant.id_proof_storage_path && tenant.id_proof_name ? {
          mimeType: tenant.id_proof_mime_type ?? null,
          name: tenant.id_proof_name,
          storagePath: tenant.id_proof_storage_path,
        } : null);
      }
    }).catch(() => { if (isActive) setLoadError('Could not load tenant. Please retry or return to the list.'); })
      .finally(() => { if (isActive) setLoadingRecord(false); });
    return () => { isActive = false; };
  }, [reset, tenantId, loadAttempt]);

  const chooseUnit = (id: string) => {
    setValue('unitId', id, { shouldValidate: true });
    const unit = units.find(item => item.id === id);
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
        due_day: parsed.data.dueDay, electricity_amount: parsed.data.electricityAmount,
        id: tenantId, monthly_rent: parsed.data.monthlyRent,
        move_in_date: parsed.data.moveInDate, // stored as plain YYYY-MM-DD, no UTC conversion
        name: parsed.data.name,
        notes: parsed.data.notes, phone: parsed.data.phone, security_deposit: parsed.data.securityDeposit,
        unit_id: parsed.data.unitId,
      });
      let proofWarning = '';
      let newlyUploadedPath = '';
      try {
        if (pickedProof) {
          const uploaded = await idProofService.upload(id, pickedProof);
          newlyUploadedPath = uploaded.storagePath;
          await tenantRepo.updateIdProof(id, uploaded);
          newlyUploadedPath = '';
          if (existingProof && existingProof.storagePath !== uploaded.storagePath) {
            await idProofService.remove(existingProof.storagePath).catch(() => undefined);
          }
        } else if (removeExistingProof && existingProof) {
          await tenantRepo.updateIdProof(id, { mimeType: null, name: null, storagePath: null });
          await idProofService.remove(existingProof.storagePath).catch(() => undefined);
        }
      } catch (error) {
        if (newlyUploadedPath) await idProofService.remove(newlyUploadedPath).catch(() => undefined);
        proofWarning = error instanceof Error ? error.message : 'The selected ID proof could not be uploaded.';
      }
      await refreshAll().catch(() => undefined);
      navigation.replace('TenantDetail', { tenantId: id });
      if (proofWarning) Alert.alert('Tenant saved', `Tenant details were saved, but the ID proof was not uploaded. ${proofWarning}`);
    } catch (error) {
      Alert.alert('Could not save tenant', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  const chooseIdProof = async () => {
    if (authStatus !== 'signedIn') {
      return Alert.alert('Cloud account required', 'Connect your Firebase account in Settings before uploading an ID proof.');
    }
    try {
      const proof = await idProofService.pick();
      if (proof) {
        setPickedProof(proof);
        setRemoveExistingProof(false);
      }
    } catch (error) {
      Alert.alert('Could not select ID proof', error instanceof Error ? error.message : 'Please try another image or PDF.');
    }
  };

  if (loadingRecord || loadError) return <ResourceState loading={loadingRecord} error={loadError} label="tenant" retry={() => setLoadAttempt(value => value + 1)} />;

  return (
    <Screen>
      <FormStep title="Unit & Tenant Setup" detail={tenantId ? 'Edit agreement' : 'New agreement'} />
      <Muted>Assign a vacant unit and initialize your tenant’s bahi-khata ledger.</Muted>
      <FormSection title="Property & Unit" subtitle="Select a premise for the rent ledger" icon="office-building-outline">
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
      </FormSection>
      <FormSection title="Tenant Identity" subtitle="KYC & contact essentials" icon="account-outline">
      <Controller control={control} name="name" render={({ field }) => <AppInput icon="account-outline" label="Primary Tenant Name *" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
      <Controller control={control} name="phone" render={({ field }) => <AppInput icon="phone-outline" label="WhatsApp Mobile Number *" keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />} />
      </FormSection>
      <FormSection title="Rent & Financial Terms" subtitle="Set the ledger billing schedule" icon="currency-inr">
      <Controller control={control} name="monthlyRent" render={({ field }) => <AppInput label="Monthly rent" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="electricityAmount" render={({ field }) => <AppInput label="Monthly electricity" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      <Body style={styles.label}>Monthly Rent Due Day</Body>
      <View style={styles.dueOptions}>{['1', '5', '7', '10'].map(day => <AppChip key={day} label={`Day ${day}`} selected={dueDay === day} onPress={() => setValue('dueDay', day)} />)}</View>
      <Controller control={control} name="dueDay" render={({ field }) => <AppInput label="Due day (1-31)" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="moveInDate" render={({ field }) => <AppInput label="Move-in date (YYYY-MM-DD)" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="securityDeposit" render={({ field }) => <AppInput label="Security deposit" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
      </FormSection>
      <FormSection title="Verification & Documents" subtitle="Government ID and agreement notes" icon="file-document-outline">
      <Pressable accessibilityRole="button" accessibilityLabel="Choose government ID document" style={styles.upload} onPress={chooseIdProof}><View style={styles.uploadIcon}><AppIcon name="cloud-upload-outline" color={colors.primaryDark} size={26} /></View><Body style={styles.label}>Upload Aadhaar / Government ID</Body><Muted style={styles.uploadText}>JPG, PNG or PDF · up to 10 MB</Muted><Muted style={styles.uploadText}>{authStatus === 'signedIn' ? 'Uploaded to your account when saved' : 'Connect an account to upload ID proof'}</Muted></Pressable>
      {pickedProof ? (
        <View style={styles.proofRow}>
          <AppIcon color={colors.primary} name="file-check-outline" size={22} />
          <View style={styles.unitInfo}><Body numberOfLines={1}>{pickedProof.name}</Body><Muted>Ready to upload when saved</Muted></View>
          <AppButton title="Remove" variant="secondary" onPress={() => setPickedProof(null)} />
        </View>
      ) : existingProof && !removeExistingProof ? (
        <View style={styles.proofRow}>
          <AppIcon color={colors.primary} name="file-lock-outline" size={22} />
          <View style={styles.unitInfo}><Body numberOfLines={1}>{existingProof.name}</Body><Muted>Stored securely in Firebase</Muted></View>
          <AppButton title="Remove" variant="secondary" onPress={() => setRemoveExistingProof(true)} />
        </View>
      ) : removeExistingProof ? <Muted>Existing ID proof will be removed when saved.</Muted> : null}
      <AppButton title={existingProof && !removeExistingProof ? 'Replace ID proof' : 'Choose ID proof'} variant="secondary" onPress={chooseIdProof} />
      <Controller control={control} name="notes" render={({ field }) => <AppInput label="Notes (optional)" value={field.value} onChangeText={field.onChange} multiline />} />
      </FormSection>
      <InfoNote title="Ledger Entry Preview">The rent cycle starts from the move-in date with your selected monthly due day.</InfoNote>
      <AppButton disabled={isSubmitting} title={isSubmitting ? 'Saving...' : tenantId ? 'Save tenant' : 'Save Tenant & Activate Ledger  →'} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dueOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  upload: { alignItems: 'center', gap: 8, padding: 20, backgroundColor: colors.primarySoft, borderRadius: 12 },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 11, textAlign: 'center' },
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
  proofRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
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
