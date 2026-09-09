import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Body, Muted } from './Typography';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { colors } from '../theme';

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] ?? '')
      .join('')
      .toUpperCase() || 'KB'
  );
}

export function BrandHeader({
  subtitle,
  onProfile,
}: {
  subtitle: string;
  onProfile: () => void;
}) {
  const user = useAuthStore(state => state.user);
  const name = useAppStore(state => state.settings.landlordName);
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <AppIcon name="home-city-outline" color={colors.surface} size={19} />
        </View>
        <View>
          <Body style={styles.name}>KirayaBahi</Body>
          <Muted style={styles.subtitle}>{subtitle}</Muted>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.pill}>
          <AppIcon
            name="cloud-check-outline"
            color={colors.success}
            size={14}
          />
          <Body style={styles.pillText}>OFFLINE READY</Body>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
          onPress={onProfile}
          style={styles.profile}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.photo} />
          ) : (
            <Body style={styles.initials}>
              {initials(name || user?.displayName || 'Kiraya Bahi')}
            </Body>
          )}
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.background,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  logo: {
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 11, lineHeight: 15 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: {
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.success,
  },
  profile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 34, height: 34, borderRadius: 17 },
  initials: {
    color: colors.primary,
    backgroundColor: colors.lavender,
    borderRadius: 18,
    width: 36,
    height: 36,
    textAlign: 'center',
    lineHeight: 36,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
