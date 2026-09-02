import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-elements';

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
  return (
    <Badge
      badgeStyle={[styles.badge, { backgroundColor }]}
      containerStyle={styles.container}
      textStyle={[styles.text, { color }]}
      value={normalized.toUpperCase()}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    borderColor: 'transparent',
    borderRadius: 6,
    height: 25,
    paddingHorizontal: 8,
  },
  container: { alignSelf: 'flex-start' },
  text: {
    fontFamily,
    fontSize: 10,
    fontWeight: '700',
  },
});
