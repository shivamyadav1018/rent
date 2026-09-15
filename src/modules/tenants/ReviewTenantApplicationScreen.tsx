import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { FormSection, InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantApplicationService, type TenantApplication } from '../../services/tenantApplicationService';
import { tenantInviteRepo } from '../../database/repositories/tenantInviteRepo';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { displayDate } from '../../utils/dates';

export function ReviewTenantApplicationScreen({ navigation, route }: any) {
  const owner = useAuthStore(state => state.user);
  const syncNow = useAuthStore(state => state.syncNow);
  const units = useAppStore(state => state.units);
  const refreshAll = useAppStore(state => state.refreshAll);
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [invitedPhone, setInvitedPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [dueDay, setDueDay] = useState('1');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    tenantApplicationService.find(route.params.applicationId)
      .then(async next => {
        if (!active) return;
        setApplication(next);
        if (next) {
          const invite = await tenantInviteRepo.find(next.invite_id);
          if (active) setInvitedPhone(invite?.tenant_phone ?? '');
        }
        if (!active) return;
        const unit = units.find(item => item.id === next?.unit_id);
        setMonthlyRent(String(unit?.monthly_rent ?? 0));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [route.params.applicationId, units]);

  const approve = async () => {
    if (!application || !owner || owner.isAnonymous || working) return;
    const rent = Number(monthlyRent);
    const securityDeposit = Number(deposit);
    const rentDueDay = Number(dueDay);
    if (!Number.isFinite(rent) || rent <= 0) return Alert.alert('Enter a valid monthly rent');
    if (!Number.isFinite(securityDeposit) || securityDeposit < 0) return Alert.alert('Enter a valid security deposit');
    if (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 31) return Alert.alert('Due day must be between 1 and 31');
    setWorking(true);
    try {
      await tenantApplicationService.approve({ applicationId: application.id, dueDay: rentDueDay, monthlyRent: rent, ownerId: owner.uid, securityDeposit });
      await syncNow();
      await refreshAll();
      Alert.alert('Tenant activated', `${application.tenant_name} is now assigned to ${application.unit_name}.`, [
        { text: 'Done', onPress: () => navigation.navigate('TenantApplications') },
      ]);
    } catch (error) {
      Alert.alert('Could not approve request', error instanceof Error ? error.message : 'Please sync and try again.');
    } finally {
      setWorking(false);
    }
  };

  const reject = () => {
    if (!application || !owner || owner.isAnonymous || working) return;
    Alert.alert('Reject this request?', 'The tenant will see that the request was not approved.', [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        setWorking(true);
        try {
          await tenantApplicationService.reject(application.id, owner.uid);
          navigation.navigate('TenantApplications');
        } catch {
          Alert.alert('Could not reject request', 'Please try again.');
        } finally {
          setWorking(false);
        }
      } },
    ]);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!application) return <Screen><Muted>This tenant request could not be found.</Muted></Screen>;
  const pending = application.status === 'submitted';

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.avatar}><AppIcon color={colors.primaryDark} name="account-outline" size={26} /></View>
        <View style={styles.info}>
          <Title style={styles.title}>{application.tenant_name}</Title>
          <Muted>{application.property_name} · {application.unit_name}</Muted>
        </View>
      </View>
      <FormSection icon="card-account-details-outline" title="Submitted details" subtitle={`Submitted ${displayDate(application.submitted_at)}`}>
        <View style={styles.row}><Muted>Mobile</Muted><Body style={styles.value}>{application.phone}</Body></View>
        {invitedPhone ? <View style={styles.row}><Muted>Number invited</Muted><Body style={styles.value}>{invitedPhone}</Body></View> : null}
        <View style={styles.unverified}><AppIcon color={colors.warning} name="alert-circle-outline" size={18} /><Muted style={styles.warning}>{invitedPhone && invitedPhone !== application.phone ? 'Submitted number differs from the invited number. Confirm it before approval.' : 'Not verified by OTP. Confirm by WhatsApp or call.'}</Muted></View>
        <View style={styles.row}><Muted>Move-in date</Muted><Body style={styles.value}>{displayDate(application.move_in_date)}</Body></View>
        <View><Muted>Current address</Muted><Body style={styles.address}>{application.current_address}</Body></View>
      </FormSection>
      {pending ? (
        <FormSection icon="cash-edit" title="Confirm rental terms" subtitle="Only the owner can set these values">
          <AppInput keyboardType="decimal-pad" label="Monthly rent *" value={monthlyRent} onChangeText={setMonthlyRent} />
          <AppInput keyboardType="number-pad" label="Rent due day *" value={dueDay} onChangeText={setDueDay} />
          <AppInput keyboardType="decimal-pad" label="Security deposit" value={deposit} onChangeText={setDeposit} />
        </FormSection>
      ) : null}
      <InfoNote title="Approval check">
        Approval rechecks that the invite is active and the unit is vacant. The tenant record and unit assignment are then saved together.
      </InfoNote>
      {pending ? <>
        <AppButton disabled={working} icon={<AppIcon color={colors.surface} name="check" size={20} />} title={working ? 'Working...' : 'Approve & activate tenant'} onPress={approve} />
        <AppButton disabled={working} title="Reject request" variant="danger" onPress={reject} />
      </> : <View style={styles.result}><Body style={styles.value}>Request {application.status}</Body></View>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  address: { marginTop: 3 },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 52, justifyContent: 'center', width: 52 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  info: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  result: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 16 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 23, lineHeight: 29 },
  unverified: { alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: radius.sm, flexDirection: 'row', gap: 8, padding: 10 },
  value: { fontWeight: '700' },
  warning: { color: colors.warning, flex: 1 },
});
