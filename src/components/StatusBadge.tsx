import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { fontFamily } from '../theme';

const colors = {
  occupied: ['#E3F1EB', '#126B54'],
  overdue: ['#FDE8E5', '#B42318'],
  paid: ['#E3F1EB', '#126B54'],
  partial: ['#FFF0D6', '#A15C00'],
  unpaid: ['#E9EEEB', '#52605A'],
  vacant: ['#E8EEF8', '#35598A'],
};

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? 'unpaid').toLowerCase() as keyof typeof colors;
  const [backgroundColor, color] = colors[normalized] ?? colors.unpaid;
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
