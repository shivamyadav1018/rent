import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fontFamily } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AppInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#8A9691" selectionColor={colors.primary} style={[styles.input, props.multiline && styles.multiline, error && styles.errorInput, style]} {...props} />
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
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontFamily,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: {
    color: colors.ink,
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  multiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' },
  wrap: {
    marginBottom: 4,
  },
});
