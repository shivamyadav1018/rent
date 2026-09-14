import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ResourceState } from '../../components/ResourceState';
import { Screen } from '../../components/Screen';
import { Body, Muted, Title } from '../../components/Typography';
import { propertyRepo } from '../../database/repositories/propertyRepo';
import { unitRepo } from '../../database/repositories/unitRepo';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { colors, radius } from '../../theme';
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
  const occupied = units.filter(unit => unit.status === 'occupied').length;
  const vacant = units.length - occupied;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.propertyIcon}><AppIcon color={colors.surface} name="office-building-outline" size={28} /></View>
        <View style={styles.heroCopy}>
          <Muted style={styles.eyebrow}>PROPERTY</Muted>
          <Title>{property.name}</Title>
          <View style={styles.locationRow}>
            <AppIcon color={colors.muted} name="map-marker-outline" size={16} />
            <Muted style={styles.location}>{property.type}{property.address ? ` · ${property.address}` : ' · Address not added'}</Muted>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Muted>Total units</Muted><Body style={styles.metricValue}>{units.length}</Body></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Muted>Occupied</Muted><Body style={[styles.metricValue, styles.occupiedValue]}>{occupied}</Body></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Muted>Vacant</Muted><Body style={[styles.metricValue, styles.vacantValue]}>{vacant}</Body></View>
      </View>

      <View style={styles.actions}>
        <AppButton icon={<AppIcon color={colors.surface} name="plus" size={19} />} style={styles.actionButton} title="Add unit" onPress={() => navigation.navigate('AddUnit', { propertyId })} />
        <AppButton icon={<AppIcon color={colors.primaryDark} name="pencil-outline" size={18} />} style={styles.actionButton} title="Edit property" variant="secondary" onPress={() => navigation.navigate('AddProperty', { propertyId })} />
      </View>

      <View style={styles.sectionHeading}>
        <View><Body style={styles.sectionTitle}>Units</Body><Muted>Rooms and rental spaces</Muted></View>
        <View style={styles.countPill}><Body style={styles.countText}>{units.length}</Body></View>
      </View>

      {units.length === 0 ? <EmptyState message="No units yet. Add the first room or rental space." /> : units.map(unit => {
        const isVacant = unit.status === 'vacant';
        return (
          <Card key={unit.id} style={styles.unitCard}>
            <View style={styles.unitHeader}>
              <View style={[styles.unitIcon, isVacant && styles.unitIconVacant]}>
                <AppIcon color={isVacant ? colors.success : colors.primaryDark} name={isVacant ? 'door-open' : 'door-closed'} size={22} />
              </View>
              <View style={styles.unitInfo}>
                <Body style={styles.unitName}>{unit.name}</Body>
                <Muted>{formatCurrency(unit.monthly_rent)} per month</Muted>
              </View>
              <View style={[styles.status, isVacant ? styles.vacantStatus : styles.occupiedStatus]}>
                <View style={[styles.statusDot, isVacant ? styles.vacantDot : styles.occupiedDot]} />
                <Body style={[styles.statusText, isVacant ? styles.vacantText : styles.occupiedText]}>{isVacant ? 'VACANT' : 'OCCUPIED'}</Body>
              </View>
            </View>
            <View style={styles.unitDivider} />
            <View style={styles.unitActions}>
              {isVacant ? <AppButton icon={<AppIcon color={colors.surface} name="account-plus-outline" size={18} />} size="compact" style={styles.unitAction} title="Add tenant" onPress={() => navigation.navigate('AddTenant', { unitId: unit.id })} /> : null}
              <AppButton icon={<AppIcon color={colors.primaryDark} name="pencil-outline" size={17} />} size="compact" style={styles.unitAction} title="Edit unit" variant="secondary" onPress={() => navigation.navigate('AddUnit', { propertyId, unitId: unit.id })} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  countPill: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 34, justifyContent: 'center', minWidth: 34 },
  countText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  hero: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  heroCopy: { flex: 1, gap: 3 },
  location: { flex: 1 },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metric: { alignItems: 'center', flex: 1, gap: 3 },
  metricDivider: { backgroundColor: colors.border, height: 38, width: 1 },
  metrics: { backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', paddingVertical: 15 },
  metricValue: { fontSize: 23, fontWeight: '800' },
  occupiedDot: { backgroundColor: colors.primary },
  occupiedStatus: { backgroundColor: colors.primarySoft },
  occupiedText: { color: colors.primaryDark },
  occupiedValue: { color: colors.primaryDark },
  propertyIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  status: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  unitAction: { flexGrow: 1 },
  unitActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  unitCard: { gap: 14 },
  unitDivider: { backgroundColor: colors.border, height: 1 },
  unitHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  unitIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
  unitIconVacant: { backgroundColor: colors.successSoft },
  unitInfo: { flex: 1, gap: 3 },
  unitName: { fontSize: 16, fontWeight: '800' },
  vacantDot: { backgroundColor: colors.success },
  vacantStatus: { backgroundColor: colors.successSoft },
  vacantText: { color: colors.success },
  vacantValue: { color: colors.success },
});
