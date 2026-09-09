import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Card } from './Card';
import { Body, Muted } from './Typography';
import { colors } from '../theme';

export function FormSection({
  title,
  subtitle,
  icon,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon: string;
}>) {
  return (
    <Card>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <AppIcon name={icon} color={colors.primaryDark} size={20} />
        </View>
        <View style={styles.info}>
          <Body style={styles.title}>{title}</Body>
          {subtitle ? <Muted style={styles.caption}>{subtitle}</Muted> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}
export function FormStep({
  title,
  detail,
  complete = false,
}: {
  title: string;
  detail: string;
  complete?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.heading}>
        <Body style={styles.stepTitle}>{title}</Body>
        <Muted style={styles.caption}>{detail}</Muted>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, complete ? styles.complete : styles.half]} />
      </View>
    </View>
  );
}
export function InfoNote({
  title,
  children,
}: React.PropsWithChildren<{ title?: string }>) {
  return (
    <View style={styles.note}>
      <AppIcon
        name="shield-check-outline"
        color={colors.primaryDark}
        size={22}
      />
      <View style={styles.info}>
        {title ? <Body style={styles.title}>{title}</Body> : null}
        <Muted>{children}</Muted>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  icon: {
    backgroundColor: colors.primarySoft,
    borderRadius: 9,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '600' },
  info: { flex: 1 },
  caption: { fontSize: 11, lineHeight: 15 },
  complete: { width: '100%' },
  half: { width: '50%' },
  step: { gap: 6 },
  stepTitle: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  track: { height: 5, backgroundColor: colors.lavender, borderRadius: 8 },
  fill: { height: 5, backgroundColor: colors.primary, borderRadius: 8 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
  },
});
