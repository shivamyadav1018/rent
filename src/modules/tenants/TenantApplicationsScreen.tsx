import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantApplicationService, type TenantApplication } from '../../services/tenantApplicationService';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { displayDate } from '../../utils/dates';

export function TenantApplicationsScreen({ navigation }: any) {
  const owner = useAuthStore(state => state.user);
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!owner || owner.isAnonymous) return;
    setLoading(true);
    try {
      setApplications(await tenantApplicationService.forOwner(owner.uid));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load tenant requests.');
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const visible = applications.filter(item => filter === 'pending' ? item.status === 'submitted' : item.status !== 'submitted');

  return (
    <Screen>
      <View>
        <Title>Tenant requests</Title>
        <Muted>Details submitted through your invite codes.</Muted>
      </View>
      <View style={styles.filters}>
        <AppChip label={`Pending ${applications.filter(item => item.status === 'submitted').length}`} selected={filter === 'pending'} style={styles.filter} onPress={() => setFilter('pending')} />
        <AppChip label={`History ${applications.filter(item => item.status !== 'submitted').length}`} selected={filter === 'history'} style={styles.filter} onPress={() => setFilter('history')} />
      </View>
      {error ? <><Muted style={styles.error}>{error}</Muted><AppButton title="Retry" variant="secondary" onPress={load} /></> : null}
      {!error && !loading && visible.length === 0 ? <EmptyState message={filter === 'pending' ? 'No tenant requests are waiting for review.' : 'Approved and rejected requests will appear here.'} /> : null}
      {visible.map(application => (
        <Card key={application.id}>
          <View style={styles.heading}>
            <View style={styles.icon}><AppIcon color={colors.primaryDark} name="account-details-outline" size={22} /></View>
            <View style={styles.info}>
              <Body style={styles.name}>{application.tenant_name}</Body>
              <Muted>{application.property_name} · {application.unit_name}</Muted>
            </View>
            <View style={[styles.status, application.status !== 'submitted' && styles.statusHistory]}>
              <Body style={styles.statusText}>{application.status.toUpperCase()}</Body>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View><Muted>MOBILE - NOT VERIFIED</Muted><Body>{application.phone}</Body></View>
            <View><Muted>MOVE-IN</Muted><Body>{displayDate(application.move_in_date)}</Body></View>
          </View>
          <AppButton
            icon={<AppIcon color={colors.primaryDark} name="eye-outline" size={19} />}
            title={application.status === 'submitted' ? 'Review request' : 'View request'}
            variant="secondary"
            onPress={() => navigation.navigate('ReviewTenantApplication', { applicationId: application.id })}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  error: { color: colors.danger },
  filter: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 42, justifyContent: 'center', width: 42 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  status: { backgroundColor: colors.warningSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  statusHistory: { backgroundColor: colors.surfaceMuted },
  statusText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
});
