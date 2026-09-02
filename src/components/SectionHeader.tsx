import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-elements';

import { colors, fontFamily } from '../theme';

export function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  detail: { color: colors.muted, fontFamily, fontSize: 12, fontWeight: '500' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  title: { color: colors.ink, fontFamily, fontSize: 17, fontWeight: '700' },
});
