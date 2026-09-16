import React, { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

import { AppIcon } from '../components/AppIcon';
import { adConfig } from '../config/ads';
import { DashboardScreen } from '../modules/dashboard/DashboardScreen';
import { TenantsScreen } from '../modules/tenants/TenantsScreen';
import { MonthlyLedgerScreen } from '../modules/ledger/MonthlyLedgerScreen';
import { PropertiesScreen } from '../modules/properties/PropertiesScreen';
import { SettingsScreen } from '../modules/settings/SettingsScreen';
import { adMobService } from '../services/adMobService';
import { colors, fontFamily } from '../theme';

export type MainTabParamList = {
  Dashboard: undefined;
  Tenants: undefined;
  Ledger: undefined;
  Properties: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons = {
  Dashboard: 'view-dashboard-outline',
  Ledger: 'book-open-page-variant-outline',
  Properties: 'office-building-outline',
  Settings: 'cog-outline',
  Tenants: 'account-group-outline',
};

const screenOptions = ({ route }: any) => {
  const icon = icons[route.name as keyof typeof icons];
  return {
    headerShown: false,
    tabBarActiveBackgroundColor: colors.primarySoft,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <AppIcon color={color} name={icon} size={size} />,
    tabBarLabelStyle: { fontFamily, fontSize: 11, fontWeight: '600' as const },
    tabBarItemStyle: { borderRadius: 14, marginHorizontal: 3 },
    tabBarHideOnKeyboard: true,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingBottom: 8, paddingTop: 8 },
  };
};

const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
const INTERSTITIAL_TAB_INTERVAL = 4;

function useTabInterstitial() {
  const [ready, setReady] = useState(false);
  const tabPressCount = useRef(0);
  const lastShownAt = useRef(0);
  const interstitial = useInterstitialAd(ready ? adConfig.interstitialUnitId : null);
  const { error, isClosed, isLoaded, isShowing, load, show } = interstitial;

  useEffect(() => {
    let active = true;
    adMobService.initialize()
      .then(canRequestAds => {
        if (active) setReady(canRequestAds);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready && !isLoaded) {
      load();
    }
  }, [isLoaded, load, ready]);

  useEffect(() => {
    if (isClosed || error) {
      load();
    }
  }, [error, isClosed, load]);

  return () => {
    tabPressCount.current += 1;
    const now = Date.now();
    if (
      tabPressCount.current % INTERSTITIAL_TAB_INTERVAL !== 0 ||
      !isLoaded ||
      isShowing ||
      now - lastShownAt.current < INTERSTITIAL_COOLDOWN_MS
    ) {
      return;
    }
    lastShownAt.current = now;
    show();
  };
}

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const maybeShowInterstitial = useTabInterstitial();
  const listeners = {
    tabPress: maybeShowInterstitial,
  };

  return (
    <Tab.Navigator screenOptions={props => {
      const options = screenOptions(props);
      return { ...options, tabBarStyle: { ...options.tabBarStyle, height: 68 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) } };
    }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} listeners={listeners} />
      <Tab.Screen name="Tenants" component={TenantsScreen} listeners={listeners} />
      <Tab.Screen name="Ledger" component={MonthlyLedgerScreen} listeners={listeners} />
      <Tab.Screen name="Properties" component={PropertiesScreen} listeners={listeners} />
      <Tab.Screen name="Settings" component={SettingsScreen} listeners={listeners} />
    </Tab.Navigator>
  );
}
