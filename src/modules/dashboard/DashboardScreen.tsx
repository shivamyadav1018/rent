import React, { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppButton } from '../../components/AppButton';
import { AppIcon } from '../../components/AppIcon';
import { BrandHeader, initials } from '../../components/BrandHeader';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { InfoNote } from '../../components/FormSection';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { Body, Muted, Title } from '../../components/Typography';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/currency';
import { displayDate, monthLabel, currentMonthYear } from '../../utils/dates';
import { colors } from '../../theme';

export function DashboardScreen({ navigation }: any) {
  const { month, year } = currentMonthYear();
  const summary = useAppStore(state => state.summary);
  const ledger = useAppStore(state => state.dashboardLedger);
  const refreshAll = useAppStore(state => state.refreshAll);
  const settings = useAppStore(state => state.settings);
  const syncStatus = useAuthStore(state => state.syncStatus);
  const syncPendingCount = useAuthStore(state => state.syncPendingCount);
  const signedIn = useAuthStore(state => state.status === 'signedIn');
  useFocusEffect(
    useCallback(() => {
      refreshAll().catch(() => undefined);
    }, [refreshAll]),
  );
  const pending = ledger.filter(item => item.balance > 0);
  const paid = ledger
    .filter(item => item.status === 'paid')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const percent =
    summary.expectedRent > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((summary.collectedRent / summary.expectedRent) * 100),
          ),
        )
      : 0;
  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
      ? 'Sync needs attention'
      : syncPendingCount > 0
      ? `${syncPendingCount} pending sync`
      : syncStatus === 'synced'
      ? 'Synced'
      : 'Saved locally';
  return (
    <Screen
      header={
        <BrandHeader
          subtitle="Dashboard"
          onProfile={() => navigation.navigate('Settings')}
        />
      }
    >
      <View style={styles.hero}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.primaryDark} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero)" />
          </Svg>
        </View>
        <View style={styles.row}>
          <View style={styles.cycle}>
            <View style={styles.dot} />
            <Muted style={styles.whiteSmall}>
              {monthLabel(month, year)} Cycle
            </Muted>
          </View>
          <Muted style={styles.sync}>{syncLabel}</Muted>
        </View>
        <Title style={styles.greeting}>
          Hello
          {settings.landlordName
            ? `, ${settings.landlordName.split(' ')[0]}`
            : ''}{' '}
          👋
        </Title>
        <Muted style={styles.heroSubtitle}>
          Here’s your rent summary for {monthLabel(month, year)}
        </Muted>
        <View style={styles.progressPanel}>
          <View style={styles.row}>
            <Muted style={styles.whiteSmall}>Collection Target</Muted>
            <Muted style={styles.mint}>{percent}% Received</Muted>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Rent collection target"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={styles.track}
          >
            <View style={[styles.progress, { width: `${percent}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.metrics}>
        {[
          {
            label: 'Expected',
            value: formatCurrency(summary.expectedRent),
            detail: `${ledger.length} units billed`,
            color: colors.ink,
          },
          {
            label: 'Collected',
            value: formatCurrency(summary.collectedRent),
            detail: `${paid.length} units paid`,
            color: colors.success,
          },
          {
            label: 'Pending',
            value: formatCurrency(summary.pendingRent),
            detail: `${pending.length} units remaining`,
            color: colors.ink,
          },
          {
            label: 'Overdue',
            value: String(summary.overdueCount),
            detail: summary.overdueCount
              ? 'Immediate action'
              : 'All up to date',
            color: summary.overdueCount ? colors.danger : colors.success,
          },
        ].map(metric => (
          <View key={metric.label} style={styles.metric}>
            <Muted style={styles.metricLabel}>{metric.label}</Muted>
            <Body
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.metricValue, { color: metric.color }]}
            >
              {metric.value}
            </Body>
            <Muted style={styles.metricDetail}>{metric.detail}</Muted>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        {[
          {
            title: '+ Add Tenant',
            icon: 'account-plus-outline',
            route: 'AddTenant',
          },
          {
            title: 'Record Rent',
            icon: 'currency-inr',
            route: 'RecordPayment',
          },
          {
            title: 'Open Khata',
            icon: 'book-open-page-variant-outline',
            route: 'Ledger',
          },
        ].map((action, i) => (
          <Pressable
            accessibilityRole="button"
            key={action.route}
            onPress={() => navigation.navigate(action.route)}
            style={({ pressed }) => [
              styles.action,
              i === 1 && styles.actionPrimary,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.actionIcon, i === 1 && styles.actionIconPrimary]}
            >
              <AppIcon
                color={i === 1 ? colors.surface : colors.primaryDark}
                name={action.icon}
                size={25}
              />
            </View>
            <Body style={[styles.actionLabel, i === 1 && styles.white]}>
              {action.title}
            </Body>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Body style={styles.sectionTitle}>
          Due this month{' '}
          <Body style={styles.pendingCount}>{pending.length} Pending</Body>
        </Body>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Ledger')}
          style={styles.link}
        >
          <Muted style={styles.linkText}>View all ›</Muted>
        </Pressable>
      </View>
      {pending.length === 0 ? (
        <EmptyState message="No pending rent for this month." />
      ) : (
        pending.slice(0, 5).map(item => (
          <Card key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${item.tenant_name}`}
              onPress={() =>
                navigation.navigate('TenantDetail', {
                  tenantId: item.tenant_id,
                })
              }
              style={styles.recordHeader}
            >
              <View style={styles.avatar}>
                <Body style={styles.avatarText}>
                  {initials(item.tenant_name)}
                </Body>
              </View>
              <View style={styles.info}>
                <Body style={styles.name}>{item.tenant_name}</Body>
                <Muted>
                  {item.property_name} · {item.unit_name}
                </Muted>
              </View>
              <StatusBadge status={item.status} />
            </Pressable>
            <View style={styles.amountPanel}>
              <View style={styles.info}>
                <Muted style={styles.caption}>Balance Due</Muted>
                <Body
                  style={[
                    styles.amount,
                    item.status === 'overdue' && styles.danger,
                  ]}
                >
                  {formatCurrency(item.balance)}
                </Body>
                {item.total_paid > 0 ? (
                  <Muted style={styles.settled}>
                    {formatCurrency(item.total_paid)} already paid
                  </Muted>
                ) : null}
              </View>
              <View style={styles.alignRight}>
                <Muted style={styles.caption}>Due Date</Muted>
                <Body style={styles.date}>{displayDate(item.due_date)}</Body>
              </View>
            </View>
            <View style={styles.actions}>
              <AppButton
                style={styles.info}
                icon={
                  <AppIcon
                    color={
                      item.status === 'partial'
                        ? colors.surface
                        : colors.success
                    }
                    name={
                      item.status === 'partial'
                        ? 'cash-multiple'
                        : 'message-text-outline'
                    }
                    size={19}
                  />
                }
                title={
                  item.status === 'partial' ? 'Record Payment' : 'Send Reminder'
                }
                variant={item.status === 'partial' ? 'primary' : 'success'}
                onPress={() =>
                  navigation.navigate(
                    item.status === 'partial'
                      ? 'RecordPayment'
                      : 'ReminderPreview',
                    { cycleId: item.id },
                  )
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  item.status === 'partial'
                    ? `Remind ${item.tenant_name}`
                    : `Call ${item.tenant_name}`
                }
                style={styles.iconButton}
                onPress={() =>
                  item.status === 'partial'
                    ? navigation.navigate('ReminderPreview', {
                        cycleId: item.id,
                      })
                    : Linking.openURL(`tel:${item.tenant_phone}`)
                }
              >
                <AppIcon
                  color={colors.primaryDark}
                  name={
                    item.status === 'partial'
                      ? 'message-text-outline'
                      : 'phone-outline'
                  }
                  size={21}
                />
              </Pressable>
            </View>
          </Card>
        ))
      )}
      <SectionHeader title="Recently paid" detail={`${paid.length} settled`} />
      {paid.length === 0 ? (
        <EmptyState message="Completed payments will appear here." />
      ) : (
        <Card>
          {paid.slice(0, 5).map(item => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View receipt for ${item.tenant_name}`}
              key={item.id}
              onPress={() =>
                navigation.navigate('ReceiptPreview', { cycleId: item.id })
              }
              style={styles.paidRow}
            >
              <View style={styles.paidIcon}>
                <AppIcon
                  name="wallet-outline"
                  color={colors.success}
                  size={21}
                />
              </View>
              <View style={styles.info}>
                <Body style={styles.name}>{item.tenant_name}</Body>
                <Muted>{item.unit_name}</Muted>
              </View>
              <View style={styles.alignRight}>
                <Body style={styles.paidAmount}>
                  {formatCurrency(item.total_paid)}
                </Body>
                <StatusBadge status="paid" />
              </View>
            </Pressable>
          ))}
        </Card>
      )}
      <InfoNote title="Your khata is available offline">
        {signedIn
          ? 'Records are saved on this device and backed up when your account syncs.'
          : 'Records are saved on this device. Connect an account in Settings to enable cloud backup.'}
      </InfoNote>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    backgroundColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cycle: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF26',
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  whiteSmall: { color: colors.surface, fontSize: 11 },
  sync: { color: '#DEE0FF', fontSize: 10, flexShrink: 1 },
  white: { color: colors.surface },
  mint: { color: colors.mint, fontSize: 12 },
  greeting: { color: colors.surface, fontSize: 25, lineHeight: 32 },
  heroSubtitle: { color: '#BBC3FF', fontSize: 14 },
  progressPanel: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF1A',
    borderRadius: 10,
    gap: 6,
  },
  track: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF33',
    overflow: 'hidden',
  },
  progress: { height: 8, borderRadius: 8, backgroundColor: colors.mint },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: 5,
  },
  metricLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  metricValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricDetail: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 7,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPrimary: { backgroundColor: '#FFFFFF33' },
  actionLabel: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
  sectionTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  pendingCount: { fontSize: 11, color: colors.danger },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primaryDark, fontSize: 12 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryDark },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  amountPanel: {
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  amount: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
    fontVariant: ['tabular-nums'],
  },
  caption: { fontSize: 11 },
  danger: { color: colors.danger },
  settled: { color: colors.success, fontSize: 11 },
  date: { fontSize: 13, fontWeight: '600' },
  alignRight: { alignItems: 'flex-end', gap: 4 },
  iconButton: {
    width: 46,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  paidIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  paidAmount: { color: colors.success, fontSize: 17, fontWeight: '700' },
});
