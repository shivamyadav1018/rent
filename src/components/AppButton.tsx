import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, fontFamily } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
  icon?: React.ReactNode;
  disabled?: boolean;
  textStyle?: TextStyle;
};

export function AppButton({ disabled, icon, title, onPress, style, textStyle, variant = 'primary' }: Props) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <View style={styles.content}>
        {icon}
        <Text style={[styles.text, variant === 'secondary' && styles.secondaryText, variant === 'danger' && styles.dangerText, textStyle]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  content: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  dangerText: { color: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: {
    opacity: 0.78,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
  },
  secondaryText: {
    color: colors.primaryDark,
  },
  text: {
    color: colors.surface,
    fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
});
