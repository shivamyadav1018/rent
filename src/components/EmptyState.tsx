import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-elements';

import { AppIcon } from './AppIcon';
import { colors, fontFamily } from '../theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><AppIcon color={colors.primary} name="inbox-outline" size={20} /></View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', borderColor: colors.border, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, gap: 10, padding: 24 },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 38, justifyContent: 'center', width: 38 },
  text: { color: colors.muted, fontFamily, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
