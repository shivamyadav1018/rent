import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { Tenant } from '../../types/models';
import { formatCurrency } from '../../utils/currency';

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
      <AppButton title="Add tenant" onPress={() => navigation.navigate('AddTenant')} />
      <AppInput label="Search" placeholder="Name or phone" value={search} onChangeText={setSearch} />
      {tenants.length === 0 ? <Muted>No tenants found.</Muted> : tenants.map(tenant => (
        <Card key={tenant.id}>
          <Body style={styles.name}>{tenant.name}</Body>
          <Muted>{tenant.property_name} / {tenant.unit_name}</Muted>
          <Body>{formatCurrency(tenant.monthly_rent)} monthly</Body>
          <StatusBadge status={tenant.current_status ?? 'unpaid'} />
          <View style={styles.actions}>
            <AppButton title="View" onPress={() => navigation.navigate('TenantDetail', { tenantId: tenant.id })} />
            <AppButton title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${tenant.phone}`)} />
            <AppButton title="Payment" variant="secondary" onPress={() => navigation.navigate('RecordPayment', { tenantId: tenant.id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, name: { fontWeight: '800' } });
