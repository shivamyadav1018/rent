import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { unitRepo } from '../../database/repositories/unitRepo';
import { Property, Unit } from '../../types/models';
import { formatCurrency } from '../../utils/currency';

export function PropertyDetailScreen({ navigation, route }: any) {
  const propertyId = route.params.propertyId as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    Promise.all([propertyRepo.find(propertyId), unitRepo.forProperty(propertyId)]).then(([nextProperty, nextUnits]) => {
      if (!isActive) return;
      setProperty(nextProperty);
      setUnits(nextUnits);
    }).catch(() => {
      if (isActive) setProperty(null);
    });
    return () => { isActive = false; };
  }, [propertyId]));

  if (!property) return <Screen><Muted>Loading property...</Muted></Screen>;

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
