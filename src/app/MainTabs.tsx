import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Building2, LayoutDashboard, ReceiptText, Settings, Users } from 'lucide-react-native';

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
  Dashboard: LayoutDashboard,
  Ledger: ReceiptText,
  Properties: Building2,
  Settings,
  Tenants: Users,
};

const screenOptions = ({ route }: any) => {
  const Icon = icons[route.name as keyof typeof icons];
  return {
    headerShown: false,
    tabBarActiveBackgroundColor: colors.primarySoft,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon color={color} size={size} strokeWidth={2.1} />,
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
