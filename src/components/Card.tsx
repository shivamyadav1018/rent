import React from 'react';
import { StyleSheet, View } from 'react-native';

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dde4df',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
});
