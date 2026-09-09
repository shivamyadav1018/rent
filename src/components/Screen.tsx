import React, { useContext } from 'react';
import { HeaderHeightContext } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

export function Screen({ children, style, backgroundColor, header }: { children: React.ReactNode; style?: ViewStyle; backgroundColor?: string; header?: React.ReactNode }) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const tabHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return (
    <SafeAreaView edges={{ top: headerHeight > 0 ? 'off' : 'additive', bottom: tabHeight > 0 ? 'off' : 'additive', left: 'additive', right: 'additive' }} style={[styles.safe, backgroundColor ? { backgroundColor } : null]}>
      {header}
      <KeyboardAvoidingView keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={[styles.content, backgroundColor ? { backgroundColor } : null, style]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
