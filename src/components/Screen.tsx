import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

export function Screen({ children, style, backgroundColor }: { children: React.ReactNode; style?: ViewStyle; backgroundColor?: string }) {
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, backgroundColor ? { backgroundColor } : null]}>
      <ScrollView contentContainerStyle={[styles.content, backgroundColor ? { backgroundColor } : null, style]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 40,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
