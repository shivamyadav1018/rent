import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { authColors, colors, fontFamily } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  variant?: 'default' | 'auth';
};

export function AppInput({ label, error, style, variant = 'default', ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const isAuth = variant === 'auth';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, isAuth && styles.labelAuth]}>{label}</Text>
      <TextInput
        placeholderTextColor={isAuth ? authColors.muted : '#8A9691'}
        selectionColor={isAuth ? authColors.primary : colors.primary}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          isAuth && styles.inputAuth,
          focused && (isAuth ? styles.focusedAuth : styles.focused),
          props.multiline && styles.multiline,
          error && styles.errorInput,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontFamily,
    fontSize: 12,
    marginTop: 4,
  },
  errorInput: {
    borderColor: colors.danger,
  },
  focused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  focusedAuth: {
    borderColor: authColors.primary,
    borderWidth: 1.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    fontFamily,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputAuth: {
    backgroundColor: authColors.background,
    borderColor: authColors.border,
    color: authColors.ink,
  },
  label: {
    color: colors.ink,
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  labelAuth: {
    color: authColors.ink,
  },
  multiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' },
  wrap: {
    marginBottom: 4,
  },
});
