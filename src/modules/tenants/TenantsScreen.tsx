import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
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
  useFocusEffect(useCallback(() => {
    let isActive = true;
    tenantRepo.list(search)
      .then(nextTenants => { if (isActive) setTenants(nextTenants); })
      .catch(() => { if (isActive) setTenants([]); });
    return () => { isActive = false; };
  }, [search]));

  return (
    <Screen>
      <Title>Tenants</Title>
      <Muted>Active renters and their current status</Muted>
      <AppButton icon={<AppIcon color={colors.surface} name="plus" size={19} />} title="Add tenant" onPress={() => navigation.navigate('AddTenant')} />
      <AppInput label="Search tenants" placeholder="Name or phone number" value={search} onChangeText={setSearch} />
      <SectionHeader detail={`${tenants.length} found`} title="Tenant records" />
      {tenants.length === 0 ? <EmptyState message="No tenants match this search." /> : tenants.map(tenant => (
        <Card key={tenant.id}>
          <View style={styles.header}><View style={styles.avatar}><AppIcon color={colors.primary} name="account-outline" size={22} /></View><View style={styles.info}><Body style={styles.name}>{tenant.name}</Body><Muted>{tenant.property_name} · {tenant.unit_name}</Muted></View><StatusBadge status={tenant.current_status ?? 'unpaid'} /></View>
          <View style={styles.rentRow}><View><Muted>Monthly rent</Muted><Body style={styles.rent}>{formatCurrency(tenant.monthly_rent)}</Body></View><AppIcon color={colors.muted} name="arrow-right" size={19} /></View>
          <View style={styles.actions}>
            <AppButton title="View" onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant.id })} />
            <AppButton icon={<AppIcon color={colors.primary} name="phone-outline" size={18} />} title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
            <AppButton title="Payment" variant="secondary" onPress={() => navigation.navigate('RecordPayment', { tenantId: tenant.id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 40, justifyContent: 'center', width: 40 }, header: { alignItems: 'center', flexDirection: 'row', gap: 11 }, info: { flex: 1 }, name: { fontWeight: '700' }, rent: { fontSize: 17, fontWeight: '700' }, rentRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' } });
