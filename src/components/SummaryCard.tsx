import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-elements';

import { Card } from './Card';
import { colors, fontFamily, radius, shadow } from '../theme';

type Props = {
  label: string;
  value: string;
  tone?: 'green' | 'coral' | 'ink' | 'gold';
};

const toneColors = {
  coral: '#D84A4A',
  gold: '#D19A2B',
  green: '#16866B',
  ink: '#475467',
};

export function SummaryCard({ label, tone = 'ink', value }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={[styles.marker, { backgroundColor: toneColors[tone] }]} />
        <Text style={styles.label}>{label}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.value, { color: toneColors[tone] }]}>
          {value}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    margin: 0,
    minHeight: 108,
    padding: 16,
  },
  content: {
    alignItems: 'flex-start',
    flex: 1,
  },
  label: {
    color: colors.muted,
    fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 14,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  marker: {
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  value: {
    color: colors.ink,
    fontFamily,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 8,
  },
});
