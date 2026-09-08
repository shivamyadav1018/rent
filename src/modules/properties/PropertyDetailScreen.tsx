import { useFocusedResource } from '../../hooks/useFocusedResource';
import { ResourceState } from '../../components/ResourceState';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { unitRepo } from '../../database/repositories/unitRepo';
import { formatCurrency } from '../../utils/currency';

export function PropertyDetailScreen({ navigation, route }: any) {
  const propertyId = route.params.propertyId as string;
  const { data, loading, error, retry } = useFocusedResource(useCallback(async () => {
    const [property, units] = await Promise.all([propertyRepo.find(propertyId), unitRepo.forProperty(propertyId)]);
    if (!property) throw new Error('Property not found.');
    return { property, units };
  }, [propertyId]));

  if (loading || !data) return <ResourceState loading={loading} error={error} label="property" retry={retry} />;
  const { property, units } = data;

  return (
    <Screen>
      <Title>{property.name}</Title>
      <Muted>{property.type}{property.address ? ` | ${property.address}` : ''}</Muted>
      <View style={styles.actions}>
        <AppButton title="Add unit" onPress={() => navigation.navigate('AddUnit', { propertyId })} />
        <AppButton title="Edit property" variant="secondary" onPress={() => navigation.navigate('AddProperty', { propertyId })} />
      </View>
      <Body style={styles.heading}>Units</Body>
      {units.length === 0 ? <Muted>No units yet.</Muted> : units.map(unit => (
        <Card key={unit.id}>
          <Body style={styles.name}>{unit.name}</Body>
          <Body>{formatCurrency(unit.monthly_rent)} / month</Body>
          <StatusBadge status={unit.status} />
          <View style={styles.actions}>
            {unit.status === 'vacant' ? <AppButton title="Add tenant" onPress={() => navigation.navigate('AddTenant', { unitId: unit.id })} /> : null}
            <AppButton title="Edit unit" variant="secondary" onPress={() => navigation.navigate('AddUnit', { propertyId, unitId: unit.id })} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontWeight: '800', marginTop: 4 }, name: { fontWeight: '800' } });
