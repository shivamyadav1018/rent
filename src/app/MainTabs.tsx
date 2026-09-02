import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppIcon } from '../components/AppIcon';
import { DashboardScreen } from '../modules/dashboard/DashboardScreen';
import { TenantsScreen } from '../modules/tenants/TenantsScreen';
import { MonthlyLedgerScreen } from '../modules/ledger/MonthlyLedgerScreen';
import { PropertiesScreen } from '../modules/properties/PropertiesScreen';
import { SettingsScreen } from '../modules/settings/SettingsScreen';
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
  Ledger: 'receipt',
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
    tabBarItemStyle: { borderRadius: 8, marginHorizontal: 3 },
    tabBarHideOnKeyboard: true,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingBottom: 8, paddingTop: 8 },
  };
};

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tenants" component={TenantsScreen} />
      <Tab.Screen name="Ledger" component={MonthlyLedgerScreen} />
      <Tab.Screen name="Properties" component={PropertiesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
