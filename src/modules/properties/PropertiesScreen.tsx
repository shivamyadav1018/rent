import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';

export function PropertiesScreen({ navigation }: any) {
  const properties = useAppStore(state => state.properties);
  const refreshAll = useAppStore(state => state.refreshAll);

  useFocusEffect(useCallback(() => { refreshAll(); }, [refreshAll]));

  return (
    <Screen>
      <Title>Properties</Title>
      <AppButton title="Add property" onPress={() => navigation.navigate('AddProperty')} />
      {properties.length === 0 ? <Muted>Add your first property, then create its units.</Muted> : null}
      {properties.map(property => (
        <Pressable key={property.id} onPress={() => navigation.navigate('PropertyDetail', { propertyId: property.id })}>
          <Card>
            <Body style={styles.name}>{property.name}</Body>
            <Muted>{property.type} {property.address ? `| ${property.address}` : ''}</Muted>
            <Body>{property.occupied_units ?? 0} occupied / {property.total_units ?? 0} units</Body>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ name: { fontWeight: '800' } });
