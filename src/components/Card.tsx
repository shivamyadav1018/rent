import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
});
