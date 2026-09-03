import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme';

export function PropertiesScreen({ navigation }: any) {
  const properties = useAppStore(state => state.properties);
  const refreshAll = useAppStore(state => state.refreshAll);

  useFocusEffect(useCallback(() => { refreshAll().catch(() => undefined); }, [refreshAll]));

  return (
    <Screen>
      <Title>Properties</Title>
      <Muted>Homes, shops and rooms in one place</Muted>
      <AppButton icon={<AppIcon color={colors.surface} name="plus" size={19} />} title="Add property" onPress={() => navigation.navigate('AddProperty')} />
      <SectionHeader detail={`${properties.length} total`} title="Your properties" />
      {properties.length === 0 ? <EmptyState message="Your properties will appear here." /> : null}
      {properties.map(property => (
        <Pressable key={property.id} onPress={() => navigation.navigate('PropertyDetail', { propertyId: property.id })}>
          <Card>
            <View style={styles.row}>
              <AppIcon color={colors.primary} name="office-building-outline" size={23} />
              <View style={styles.info}><Body style={styles.name}>{property.name}</Body><Muted>{property.type} {property.address ? `· ${property.address}` : ''}</Muted><Body style={styles.occupancy}>{property.occupied_units ?? 0} occupied · {property.total_units ?? 0} units</Body></View>
              <AppIcon color={colors.muted} name="arrow-right" size={19} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ info: { flex: 1, gap: 3 }, name: { fontWeight: '700' }, occupancy: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 }, row: { alignItems: 'center', flexDirection: 'row', gap: 12 } });
