import React, { useState } from 'react';
import { StyleSheet, TextInputProps } from 'react-native';
import { Input } from 'react-native-elements';

import { authColors, colors, fontFamily } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  variant?: 'default' | 'auth';
};

export function AppInput({ label, error, style, variant = 'default', ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const isAuth = variant === 'auth';
  const primary = isAuth ? authColors.primary : colors.primary;

  return (
    <Input
      {...props}
      containerStyle={styles.container}
      errorMessage={error}
      errorStyle={styles.error}
      inputContainerStyle={[
        styles.inputContainer,
        isAuth && styles.inputAuth,
        focused && (isAuth ? styles.focusedAuth : styles.focused),
        error ? styles.errorInput : null,
        props.multiline ? styles.multilineContainer : null,
      ]}
      inputStyle={[styles.input, isAuth && styles.inputAuthText, props.multiline && styles.multiline, style]}
      label={label}
      labelStyle={[styles.label, isAuth && styles.labelAuth]}
      onBlur={event => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      onFocus={event => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      placeholderTextColor={isAuth ? authColors.muted : colors.muted}
      renderErrorMessage={Boolean(error)}
      selectionColor={primary}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0 },
  error: { color: colors.danger, fontFamily, fontSize: 12, margin: 0, marginTop: 4 },
  errorInput: { borderColor: colors.danger },
  focused: { borderColor: colors.primary, borderWidth: 1.5 },
  focusedAuth: { borderColor: authColors.primary, borderWidth: 1.5 },
  input: { color: colors.ink, fontFamily, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  inputAuth: { backgroundColor: authColors.background, borderColor: authColors.border, minHeight: 52 },
  inputAuthText: { color: authColors.ink },
  inputContainer: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1.25, minHeight: 50 },
  label: { color: colors.ink, fontFamily, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  labelAuth: { color: authColors.ink },
  multiline: { minHeight: 110, paddingTop: 14, textAlignVertical: 'top' },
  multilineContainer: { minHeight: 112 },
});
