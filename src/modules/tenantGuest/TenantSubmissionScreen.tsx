import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantApplicationService, type TenantApplication } from '../../services/tenantApplicationService';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

export function TenantSubmissionScreen({ route }: any) {
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const requested = route.params?.applicationId;
      const next = requested ? await tenantApplicationService.find(requested) : (await tenantApplicationService.mine(user.uid))[0];
      setApplication(next ?? null);
    } finally {
      setLoading(false);
    }
  }, [route.params?.applicationId, user]);

  useFocusEffect(useCallback(() => { load().catch(() => undefined); }, [load]));

  if (loading && !application) return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>;

  const approved = application?.status === 'approved';
  const rejected = application?.status === 'rejected';
  return (
    <Screen style={styles.screen}>
      <View style={[styles.icon, approved && styles.approvedIcon, rejected && styles.rejectedIcon]}>
        <AppIcon color={approved ? colors.success : rejected ? colors.danger : colors.primaryDark} name={approved ? 'check-circle-outline' : rejected ? 'close-circle-outline' : 'clock-check-outline'} size={42} />
      </View>
      <Title style={styles.center}>{approved ? 'Request approved' : rejected ? 'Request not approved' : 'Details sent to owner'}</Title>
      <Muted style={styles.center}>
        {approved
          ? 'Your tenancy has been activated. The owner can now manage your rent ledger.'
          : rejected
            ? 'The owner declined this request. Contact the owner if you need a new invitation.'
            : 'The owner will check your details and confirm your mobile number by WhatsApp or call.'}
      </Muted>
      {application ? (
        <View style={styles.summary}>
          <View><Muted>PROPERTY</Muted><Body style={styles.value}>{application.property_name}</Body></View>
          <View><Muted>UNIT</Muted><Body style={styles.value}>{application.unit_name}</Body></View>
          <View><Muted>NAME</Muted><Body style={styles.value}>{application.tenant_name}</Body></View>
          <View><Muted>STATUS</Muted><Body style={styles.value}>{application.status.toUpperCase()}</Body></View>
        </View>
      ) : <Muted style={styles.center}>No submitted request was found on this device.</Muted>}
      <AppButton title="Refresh status" variant="secondary" onPress={load} />
      <AppButton title="Exit tenant mode" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  approvedIcon: { backgroundColor: colors.successSoft },
  center: { maxWidth: 360, textAlign: 'center' },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 78, justifyContent: 'center', width: 78 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  rejectedIcon: { backgroundColor: colors.dangerSoft },
  screen: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  summary: { alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: 14, padding: 18 },
  value: { fontWeight: '700', marginTop: 2 },
});
