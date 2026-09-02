import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from 'react-native-elements';

import { colors, fontFamily } from '../theme';

export function Title({ style, ...props }: TextProps) {
  return <Text style={[styles.title, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text style={[styles.body, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text style={[styles.muted, style]} {...props} />;
}

const styles = StyleSheet.create({
  body: {
    color: colors.ink,
    fontFamily,
    fontSize: 15,
    lineHeight: 21,
  },
  muted: {
    color: colors.muted,
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: colors.ink,
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 34,
  },
});
