import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from './AppIcon';
import { Body } from './Typography';
import { colors, radius } from '../theme';
import { monthLabel } from '../utils/dates';

export function MonthSelector({ month, year, onChange, disabled = false }: {
  month: number;
  year: number;
  onChange: (delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" accessibilityState={{ disabled }} disabled={disabled} onPress={() => onChange(-1)} style={styles.button}>
        <AppIcon name="chevron-left" size={24} color={disabled ? colors.muted : colors.primary} />
      </Pressable>
      <Body accessibilityRole="header" style={styles.label}>{monthLabel(month, year)}</Body>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled }} disabled={disabled} onPress={() => onChange(1)} style={styles.button}>
        <AppIcon name="chevron-right" size={24} color={disabled ? colors.muted : colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48, width: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  label: { flex: 1, textAlign: 'center', fontWeight: '700' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
});
