import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DashboardScreen } from '../modules/dashboard/DashboardScreen';
import { TenantsScreen } from '../modules/tenants/TenantsScreen';
import { MonthlyLedgerScreen } from '../modules/ledger/MonthlyLedgerScreen';
import { PropertiesScreen } from '../modules/properties/PropertiesScreen';
import { SettingsScreen } from '../modules/settings/SettingsScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Tenants: undefined;
  Ledger: undefined;
  Properties: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0f766e' }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tenants" component={TenantsScreen} />
      <Tab.Screen name="Ledger" component={MonthlyLedgerScreen} />
      <Tab.Screen name="Properties" component={PropertiesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
