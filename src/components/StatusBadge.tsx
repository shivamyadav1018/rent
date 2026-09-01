import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fontFamily } from '../theme';

const statusColors = {
  occupied: [colors.primarySoft, colors.primary],
  overdue:  [colors.dangerSoft, colors.danger],
  paid:     [colors.primarySoft, colors.primary],
  partial:  [colors.warningSoft, colors.warning],
  unpaid:   [colors.surfaceMuted, colors.muted],
  vacant:   ['#E8EEF8', '#35598A'],
};

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? 'unpaid').toLowerCase() as keyof typeof statusColors;
  const [backgroundColor, color] = statusColors[normalized] ?? statusColors.unpaid;
  return <Text style={[styles.badge, { backgroundColor, color }]}>{normalized.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    fontFamily,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
