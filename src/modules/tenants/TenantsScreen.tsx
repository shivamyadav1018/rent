import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, Phone, Plus, UserRound } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme';

type TenantRow = Tenant & { unit_name: string; property_name: string; current_status?: string };

export function TenantsScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const load = useCallback(() => { tenantRepo.list(search).then(setTenants); }, [search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <Title>Tenants</Title>
      <Muted>Active renters and their current status</Muted>
      <AppButton icon={<Plus color={colors.surface} size={18} />} title="Add tenant" onPress={() => navigation.navigate('AddTenant')} />
      <AppInput label="Search tenants" placeholder="Name or phone number" value={search} onChangeText={setSearch} />
      <SectionHeader detail={`${tenants.length} found`} title="Tenant records" />
      {tenants.length === 0 ? <EmptyState message="No tenants match this search." /> : tenants.map(tenant => (
        <Card key={tenant.id}>
          <View style={styles.header}><View style={styles.avatar}><UserRound color={colors.primary} size={20} /></View><View style={styles.info}><Body style={styles.name}>{tenant.name}</Body><Muted>{tenant.property_name} · {tenant.unit_name}</Muted></View><StatusBadge status={tenant.current_status ?? 'unpaid'} /></View>
          <View style={styles.rentRow}><View><Muted>Monthly rent</Muted><Body style={styles.rent}>{formatCurrency(tenant.monthly_rent)}</Body></View><ArrowRight color={colors.muted} size={18} /></View>
          <View style={styles.actions}>
            <AppButton title="View" onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant.id })} />
            <AppButton icon={<Phone color={colors.primary} size={16} />} title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
            <AppButton title="Payment" variant="secondary" onPress={() => navigation.navigate('RecordPayment', { tenantId: tenant.id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, header: { alignItems: 'center', flexDirection: 'row', gap: 11 }, info: { flex: 1 }, name: { fontWeight: '700' }, rent: { fontSize: 17, fontWeight: '700' }, rentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' } });
