import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';

import { colors, fontFamily } from '../theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Inbox color={colors.primary} size={20} strokeWidth={2} /></View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', borderColor: colors.border, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, gap: 10, padding: 24 },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 38, justifyContent: 'center', width: 38 },
  text: { color: colors.muted, fontFamily, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
