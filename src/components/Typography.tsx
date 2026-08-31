import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

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
    color: '#33413b',
    fontSize: 15,
    lineHeight: 21,
  },
  muted: {
    color: '#68716d',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#17201d',
    fontSize: 26,
    fontWeight: '900',
  },
});
