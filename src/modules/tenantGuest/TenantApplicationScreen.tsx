import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppDatePicker } from '../../components/AppDatePicker';
import { AppIcon } from '../../components/AppIcon';
import { AppInput } from '../../components/AppInput';
import { FormSection, InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { Muted, Title } from '../../components/Typography';
import { tenantApplicationService, type PublicTenantInvite } from '../../services/tenantApplicationService';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { isValidDate, todayDate } from '../../utils/dates';

export function TenantApplicationScreen({ navigation, route }: any) {
  const user = useAuthStore(state => state.user);
  const [invite, setInvite] = useState<PublicTenantInvite | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [moveInDate, setMoveInDate] = useState(todayDate());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    tenantApplicationService.lookupInvite(route.params.code)
      .then(next => { if (active) setInvite(next); })
      .catch(error => { if (active) Alert.alert('Invite unavailable', error instanceof Error ? error.message : 'Ask the owner for a new code.', [{ text: 'Back', onPress: navigation.goBack }]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigation.goBack, route.params.code]);

  const submit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!invite || !user) return;
    if (name.trim().length < 2) return Alert.alert('Enter your full name');
    if (digits.length < 10 || digits.length > 15) return Alert.alert('Enter a valid mobile number');
    if (address.trim().length < 5) return Alert.alert('Enter your current address');
    if (!isValidDate(moveInDate)) return Alert.alert('Choose a valid move-in date');
    setSubmitting(true);
    try {
      const application = await tenantApplicationService.submit(invite, user.uid, {
        current_address: address,
        move_in_date: moveInDate,
        phone: digits,
        tenant_name: name,
      });
      navigation.replace('TenantSubmission', { applicationId: application.id });
    } catch (error) {
      Alert.alert('Could not submit details', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !invite) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <Screen>
      <View style={styles.destination}>
        <View style={styles.destinationIcon}><AppIcon color={colors.primaryDark} name="home-outline" size={23} /></View>
        <View style={styles.info}>
          <Title style={styles.title}>{invite.unit_name}</Title>
          <Muted>{invite.property_name}</Muted>
        </View>
      </View>
      <FormSection icon="account-outline" title="Your details" subtitle="The owner will verify these before approval">
        <AppInput autoCapitalize="words" label="Full name *" placeholder="Your full name" value={name} onChangeText={setName} />
        <AppInput keyboardType="phone-pad" label="Mobile number *" placeholder="98765 43210" value={phone} onChangeText={setPhone} />
        <AppInput label="Current address *" multiline placeholder="House, street, locality and city" value={address} onChangeText={setAddress} />
        <AppDatePicker label="Expected move-in date *" value={moveInDate} onChange={setMoveInDate} />
      </FormSection>
      <InfoNote title="Before you submit">
        Your phone is not verified by OTP. The owner will confirm it with you by WhatsApp or call. Do not enter Aadhaar or other ID numbers here.
      </InfoNote>
      <AppButton
        disabled={submitting}
        icon={<AppIcon color={colors.surface} name="send-outline" size={19} />}
        title={submitting ? 'Submitting...' : 'Submit for owner approval'}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  destination: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: 12, padding: 15 },
  destinationIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, height: 44, justifyContent: 'center', width: 44 },
  info: { flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 26 },
});
