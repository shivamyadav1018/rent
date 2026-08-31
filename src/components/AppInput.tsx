import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AppInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#8b9691" style={[styles.input, error && styles.errorInput, style]} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#b42318',
    fontSize: 12,
    marginTop: 4,
  },
  errorInput: {
    borderColor: '#f04438',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd8d3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#17201d',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  label: {
    color: '#33413b',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  wrap: {
    marginBottom: 14,
  },
});
