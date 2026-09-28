import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, Building2, Plus } from 'lucide-react-native';

import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { Body, Muted, Title } from '../../components/Typography';
import { unitRepo } from '../../database/repositories/unitRepo';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme';

type VacancyStat = { property_name: string; total: number; occupied: number; vacant: number };

export function PropertiesScreen({ navigation }: any) {
  const properties = useAppStore(state => state.properties);
  const refreshAll = useAppStore(state => state.refreshAll);
  const [vacancyStats, setVacancyStats] = useState<VacancyStat[]>([]);

  useFocusEffect(useCallback(() => {
    refreshAll();
    unitRepo.vacancyStats().then(setVacancyStats).catch(() => undefined);
  }, [refreshAll]));

  return (
    <Screen>
      <Title>Properties</Title>
      <Muted>Homes, shops and rooms in one place</Muted>
      <AppButton icon={<Plus color={colors.surface} size={18} />} title="Add property" onPress={() => navigation.navigate('AddProperty')} />

      {/* Improvement 11: Vacancy overview card */}
      {vacancyStats.length > 0 ? (
        <Card>
          <Body style={styles.vacancyTitle}>Vacancy Overview</Body>
          {vacancyStats.map(stat => (
            <View key={stat.property_name} style={styles.vacancyRow}>
              <Muted style={styles.vacancyName} numberOfLines={1}>{stat.property_name}</Muted>
              <View style={styles.vacancyBarWrap}>
                <View style={[styles.vacancyBar, { flex: stat.total > 0 ? stat.occupied / stat.total : 0 }]} />
                <View style={{ flex: stat.total > 0 ? stat.vacant / stat.total : 0 }} />
              </View>
              <Muted style={styles.vacancyCount}>{stat.occupied}/{stat.total}</Muted>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionHeader detail={`${properties.length} total`} title="Your properties" />
      {properties.length === 0 ? <EmptyState message="Your properties will appear here." /> : null}
      {properties.map(property => (
        <Pressable key={property.id} onPress={() => navigation.navigate('PropertyDetail', { propertyId: property.id })}>
          <Card>
            <View style={styles.row}>
              <Building2 color={colors.primary} size={22} />
              <View style={styles.info}><Body style={styles.name}>{property.name}</Body><Muted>{property.type} {property.address ? `· ${property.address}` : ''}</Muted><Body style={styles.occupancy}>{property.occupied_units ?? 0} occupied · {property.total_units ?? 0} units</Body></View>
              <ArrowRight color={colors.muted} size={18} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { flex: 1, gap: 3 },
  name: { fontWeight: '700' },
  occupancy: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  vacancyTitle: { fontWeight: '700', marginBottom: 8 },
  vacancyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vacancyName: { width: 90, fontSize: 12 },
  vacancyBarWrap: { flex: 1, height: 10, backgroundColor: colors.border, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' },
  vacancyBar: { backgroundColor: colors.primary, borderRadius: 5 },
  vacancyCount: { fontSize: 12, width: 32, textAlign: 'right' },
});
