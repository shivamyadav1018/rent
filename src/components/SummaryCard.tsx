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
  coral: colors.accent,
  gold: '#D19A2B',
  green: colors.primary,
  ink: '#35453F',
};

export function SummaryCard({ label, tone = 'ink', value }: Props) {
  return (
    <Card style={styles.card}>
      <View style={[styles.marker, { backgroundColor: toneColors[tone] }]} />
      <Text style={styles.label}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.value, { color: toneColors[tone] }]}>
        {value}
      </Text>
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
    overflow: 'hidden',
    padding: 16,
    paddingTop: 20,
  },
  label: {
    color: colors.muted,
    fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  marker: { height: 5, left: 0, position: 'absolute', right: 0, top: 0 },
  value: {
    color: colors.ink,
    fontFamily,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
});
