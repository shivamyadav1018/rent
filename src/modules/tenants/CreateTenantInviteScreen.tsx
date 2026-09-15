import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { EmptyState } from '../../components/EmptyState';
import { FormSection, InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantInviteRepo } from '../../database/repositories/tenantInviteRepo';
import { tenantInviteService } from '../../services/tenantInviteService';
import { tenantApplicationService } from '../../services/tenantApplicationService';
import { whatsappShareService } from '../../services/whatsappShareService';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

const phoneDigits = (value: string) => value.replace(/\D/g, '');

export function CreateTenantInviteScreen({ navigation, route }: any) {
  const units = useAppStore(state => state.units);
  const settings = useAppStore(state => state.settings);
  const refreshAll = useAppStore(state => state.refreshAll);
  const owner = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const vacantUnits = useMemo(() => units.filter(unit => unit.status === 'vacant'), [units]);
  const requestedUnitId = route.params?.unitId;
  const [selectedUnitId, setSelectedUnitId] = useState(requestedUnitId ?? '');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    refreshAll().catch(() => undefined);
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedUnitId && vacantUnits.length === 1) setSelectedUnitId(vacantUnits[0].id);
  }, [selectedUnitId, vacantUnits]);

  const createAndShare = async () => {
    if (working) return;
    if (role !== 'owner' || !owner || owner.isAnonymous) {
      return Alert.alert('Owner sign-in required', 'Connect your owner account before creating a tenant invite.');
    }
    const selected = vacantUnits.find(unit => unit.id === selectedUnitId);
    if (!selected) return Alert.alert('Select a vacant unit', 'Choose the property and unit for this invite.');
    const digits = phoneDigits(phone);
    if (digits.length < 10 || digits.length > 15) {
      return Alert.alert('Enter a valid WhatsApp number', 'Use a 10 to 15 digit mobile number.');
    }
    setWorking(true);
    try {
      const created = await tenantInviteRepo.create({
        expires_in_days: expiryDays,
        property_id: selected.property_id,
        tenant_name: tenantName,
        tenant_phone: digits,
        unit_id: selected.id,
      });
      await tenantApplicationService.publishInvite(owner.uid, {
        ...created,
        last_shared_at: null,
        owner_id: owner.uid,
        property_id: selected.property_id,
        property_name: selected.property_name ?? 'Property',
        status: 'active',
        tenant_name: tenantName.trim() || null,
        tenant_phone: digits,
        unit_id: selected.id,
        unit_name: selected.name,
      });
      await whatsappShareService.shareMessage(digits, tenantInviteService.message({
        code: created.code,
        expires_at: created.expires_at,
        landlordName: settings.landlordName,
        property_name: selected.property_name ?? 'Property',
        tenant_name: tenantName.trim() || null,
        unit_name: selected.name,
      }));
      await tenantInviteRepo.markShared(created.id);
      navigation.replace('TenantInvites');
    } catch (error) {
      Alert.alert('Could not create invite', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.heroIcon}><AppIcon color={colors.primaryDark} name="account-arrow-right-outline" size={25} /></View>
        <View style={styles.info}>
          <Title style={styles.title}>Invite a tenant</Title>
          <Muted>Choose a vacant unit and send a private code on WhatsApp.</Muted>
        </View>
      </View>

      <FormSection icon="door-open" title="Vacant unit" subtitle="The invite is reserved for one unit">
        {vacantUnits.length === 0 ? (
          <EmptyState message="No vacant units are available. Add a unit or complete a move-out first." />
        ) : vacantUnits.map(unit => {
          const selected = unit.id === selectedUnitId;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={unit.id}
              onPress={() => setSelectedUnitId(unit.id)}
              style={[styles.unit, selected && styles.unitSelected]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.info}>
                <Body style={styles.unitName}>{unit.name}</Body>
                <Muted>{unit.property_name}</Muted>
              </View>
            </Pressable>
          );
        })}
      </FormSection>

      <FormSection icon="account-outline" title="Tenant contact" subtitle="Used only to prepare the WhatsApp invite">
        <AppInput label="Tenant name (optional)" placeholder="For example, Rahul Sharma" value={tenantName} onChangeText={setTenantName} />
        <AppInput keyboardType="phone-pad" label="WhatsApp mobile number *" placeholder="98765 43210" value={phone} onChangeText={setPhone} />
      </FormSection>

      <FormSection icon="clock-outline" title="Code validity" subtitle="Expired codes cannot be submitted">
        <View style={styles.chips}>
          {[3, 7, 14].map(days => (
            <AppChip key={days} label={`${days} days`} selected={expiryDays === days} style={styles.chip} onPress={() => setExpiryDays(days)} />
          ))}
        </View>
      </FormSection>

      <InfoNote title="Privacy first">
        The message asks for basic details only. Identity documents should be uploaded inside the secure registration flow, never sent over WhatsApp.
      </InfoNote>
      <AppButton
        disabled={working || vacantUnits.length === 0}
        icon={<AppIcon color={colors.surface} name="whatsapp" size={20} />}
        title={working ? 'Preparing invite...' : 'Create & open WhatsApp'}
        onPress={createAndShare}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1 },
  chips: { flexDirection: 'row', gap: 8 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  info: { flex: 1 },
  radio: { alignItems: 'center', borderColor: colors.muted, borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 },
  radioDot: { backgroundColor: colors.surface, borderRadius: 4, height: 8, width: 8 },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  title: { fontSize: 24, lineHeight: 30 },
  unit: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 62, padding: 12 },
  unitName: { fontWeight: '700' },
  unitSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
});
