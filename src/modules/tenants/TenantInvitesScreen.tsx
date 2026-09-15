import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppChip } from '../../components/AppChip';
import { AppIcon } from '../../components/AppIcon';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantInviteRepo, type TenantInviteListItem } from '../../database/repositories/tenantInviteRepo';
import { tenantInviteService } from '../../services/tenantInviteService';
import { tenantApplicationService } from '../../services/tenantApplicationService';
import { whatsappShareService } from '../../services/whatsappShareService';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { displayDate } from '../../utils/dates';

export function TenantInvitesScreen({ navigation }: any) {
  const landlordName = useAppStore(state => state.settings.landlordName);
  const owner = useAuthStore(state => state.user);
  const [invites, setInvites] = useState<TenantInviteListItem[]>([]);
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvites(await tenantInviteRepo.list());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load invites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const share = async (invite: TenantInviteListItem) => {
    try {
      if (!owner || owner.isAnonymous) throw new Error('Owner sign-in required.');
      await tenantApplicationService.publishInvite(owner.uid, invite);
      await whatsappShareService.shareMessage(invite.tenant_phone, tenantInviteService.message({ ...invite, landlordName }));
      await tenantInviteRepo.markShared(invite.id);
      await load();
    } catch {
      Alert.alert('Could not share invite', 'Please try again.');
    }
  };

  const cancel = (invite: TenantInviteListItem) => {
    Alert.alert('Cancel this invite?', `Code ${invite.code} will stop working.`, [
      { text: 'Keep invite', style: 'cancel' },
      { text: 'Cancel invite', style: 'destructive', onPress: async () => {
        try {
          if (!owner || owner.isAnonymous) throw new Error('Owner sign-in required.');
          await tenantApplicationService.cancelPublishedInvite(owner.uid, invite.code);
          await tenantInviteRepo.cancel(invite.id);
          await load();
        } catch {
          Alert.alert('Could not cancel invite', 'Please try again.');
        }
      } },
    ]);
  };

  const visible = invites.filter(invite => filter === 'active' ? invite.status === 'active' : invite.status !== 'active');

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.info}>
          <Title>Tenant invites</Title>
          <Muted>Create, track and re-share onboarding codes.</Muted>
        </View>
        <Pressable accessibilityLabel="Create tenant invite" accessibilityRole="button" onPress={() => navigation.navigate('CreateTenantInvite')} style={styles.addButton}>
          <AppIcon color={colors.surface} name="plus" size={24} />
        </Pressable>
      </View>
      <View style={styles.filters}>
        <AppChip label={`Active ${invites.filter(item => item.status === 'active').length}`} selected={filter === 'active'} style={styles.filter} onPress={() => setFilter('active')} />
        <AppChip label={`History ${invites.filter(item => item.status !== 'active').length}`} selected={filter === 'history'} style={styles.filter} onPress={() => setFilter('history')} />
      </View>
      <AppButton
        icon={<AppIcon color={colors.primaryDark} name="clipboard-account-outline" size={19} />}
        title="Review tenant requests"
        variant="secondary"
        onPress={() => navigation.navigate('TenantApplications')}
      />

      {error ? <><Muted style={styles.error}>{error}</Muted><AppButton title="Retry" variant="secondary" onPress={load} /></> : null}
      {!error && !loading && visible.length === 0 ? (
        <EmptyState message={filter === 'active' ? 'No active invites. Create one for a vacant unit.' : 'Expired and cancelled invites will appear here.'} />
      ) : null}
      {visible.map(invite => (
        <Card key={invite.id}>
          <View style={styles.heading}>
            <View style={styles.inviteIcon}><AppIcon color={colors.primaryDark} name="account-clock-outline" size={22} /></View>
            <View style={styles.info}>
              <Body style={styles.name}>{invite.tenant_name || 'New tenant'}</Body>
              <Muted>{invite.property_name} · {invite.unit_name}</Muted>
            </View>
            <View style={[styles.status, invite.status !== 'active' && styles.statusMuted]}>
              <Body style={[styles.statusText, invite.status !== 'active' && styles.statusTextMuted]}>{invite.status.toUpperCase()}</Body>
            </View>
          </View>
          <View style={styles.codeRow}>
            <View>
              <Muted>INVITE CODE</Muted>
              <Body style={styles.code}>{invite.code}</Body>
            </View>
            <Pressable
              accessibilityLabel={`Copy invite code ${invite.code}`}
              accessibilityRole="button"
              onPress={() => { Clipboard.setString(invite.code); Alert.alert('Code copied', invite.code); }}
              style={styles.copyButton}
            >
              <AppIcon color={colors.primaryDark} name="content-copy" size={19} />
            </Pressable>
          </View>
          <View style={styles.meta}>
            <Muted>WhatsApp: {invite.tenant_phone}</Muted>
            <Muted>{invite.status === 'active' ? `Expires ${displayDate(invite.expires_at)}` : `Created ${displayDate(invite.created_at)}`}</Muted>
          </View>
          {invite.status === 'active' ? (
            <View style={styles.actions}>
              <AppButton icon={<AppIcon color={colors.surface} name="whatsapp" size={18} />} style={styles.info} title="Share again" onPress={() => share(invite)} />
              <Pressable accessibilityLabel={`Cancel invite ${invite.code}`} accessibilityRole="button" onPress={() => cancel(invite)} style={styles.cancelButton}>
                <AppIcon color={colors.danger} name="close" size={23} />
              </Pressable>
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  addButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  cancelButton: { alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radius.md, height: 50, justifyContent: 'center', width: 50 },
  code: { color: colors.primaryDark, fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 0 },
  codeRow: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  copyButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  error: { color: colors.danger },
  filter: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  info: { flex: 1 },
  inviteIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 42, justifyContent: 'center', width: 42 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  status: { backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  statusMuted: { backgroundColor: colors.surfaceMuted },
  statusText: { color: colors.success, fontSize: 9, fontWeight: '800' },
  statusTextMuted: { color: colors.muted },
});
