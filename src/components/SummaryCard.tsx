import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily } from '../theme';

type Props = {
  label: string;
  value: string;
  tone?: 'green' | 'coral' | 'ink' | 'gold';
};

const toneColors = { coral: colors.accent, gold: '#D19A2B', green: colors.primary, ink: '#35453F' };

export function SummaryCard({ label, tone = 'ink', value }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.marker, { backgroundColor: toneColors[tone] }]} />
      <Text style={styles.label}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 100,
    overflow: 'hidden',
    padding: 14,
  },
  label: {
    color: colors.muted,
    fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: colors.ink,
    fontFamily,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 12,
  },
  marker: { height: 4, left: 0, position: 'absolute', right: 0, top: 0 },
});
