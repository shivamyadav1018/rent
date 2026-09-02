import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Card as RneCard } from 'react-native-elements';

import { colors, radius, shadow } from '../theme';

const ElementsCard = RneCard as unknown as React.ComponentType<
  React.PropsWithChildren<{
    containerStyle?: StyleProp<ViewStyle>;
    wrapperStyle?: StyleProp<ViewStyle>;
  }>
>;

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <ElementsCard containerStyle={[styles.card, style]} wrapperStyle={styles.wrapper}>{children}</ElementsCard>;
}

const styles = StyleSheet.create({
  card: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    margin: 0,
    padding: 16,
  },
  wrapper: { gap: 10 },
});
