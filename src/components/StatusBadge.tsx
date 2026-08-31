import React from 'react';
import { StyleSheet, Text } from 'react-native';

const colors = {
  overdue: ['#fee2e2', '#b42318'],
  paid: ['#dcfce7', '#166534'],
  partial: ['#fef3c7', '#92400e'],
  unpaid: ['#e5e7eb', '#374151'],
};

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? 'unpaid') as keyof typeof colors;
  const [backgroundColor, color] = colors[normalized] ?? colors.unpaid;
  return <Text style={[styles.badge, { backgroundColor, color }]}>{normalized.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
