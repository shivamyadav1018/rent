import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './MainTabs';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { WelcomeScreen } from '../modules/onboarding/WelcomeScreen';
import { LandlordSetupScreen } from '../modules/onboarding/LandlordSetupScreen';
import { AddEditPropertyScreen } from '../modules/properties/AddEditPropertyScreen';
import { PropertyDetailScreen } from '../modules/properties/PropertyDetailScreen';
import { AddEditUnitScreen } from '../modules/properties/AddEditUnitScreen';
import { AddEditTenantScreen } from '../modules/tenants/AddEditTenantScreen';
import { TenantDetailScreen } from '../modules/tenants/TenantDetailScreen';
import { RecordPaymentScreen } from '../modules/payments/RecordPaymentScreen';
import { ReminderPreviewScreen } from '../modules/reminders/ReminderPreviewScreen';
import { ReceiptPreviewScreen } from '../modules/receipts/ReceiptPreviewScreen';
import { authColors, colors, fontFamily } from '../theme';

export type RootStackParamList = {
  Welcome: undefined;
  LandlordSetup: undefined;
  MainTabs: undefined;
  AddProperty: { propertyId?: string } | undefined;
  PropertyDetail: { propertyId: string };
  AddUnit: { propertyId: string; unitId?: string };
  AddTenant: { tenantId?: string; unitId?: string } | undefined;
  TenantDetail: { tenantId: string };
  RecordPayment: { tenantId?: string; cycleId?: string } | undefined;
  ReminderPreview: { cycleId: string };
  ReceiptPreview: { cycleId: string; amountPaid?: number; paymentMode?: string; paymentDate?: string; referenceNo?: string; notes?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const onboardingDone = useAppStore(state => state.onboardingDone);
  const authStatus = useAuthStore(state => state.status);
  const offlineMode = useAuthStore(state => state.offlineMode);
  const hasAccess = authStatus === 'signedIn' || offlineMode;

  if (authStatus === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const flow = !hasAccess ? 'signedOut' : onboardingDone ? 'app' : 'setup';

  return (
    <NavigationContainer key={flow}>
      <Stack.Navigator
        initialRouteName={!hasAccess ? 'Welcome' : onboardingDone ? 'MainTabs' : 'LandlordSetup'}
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily, fontSize: 18, fontWeight: '700' },
        }}>
        {!hasAccess ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        ) : !onboardingDone ? (
          <Stack.Screen
            name="LandlordSetup"
            component={LandlordSetupScreen}
            options={{
              title: 'Your details',
              headerBackVisible: false,
              headerStyle: { backgroundColor: authColors.background },
              headerTintColor: authColors.ink,
              headerTitleStyle: { fontFamily, fontSize: 18, fontWeight: '700', color: authColors.ink },
            }}
          />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AddProperty" component={AddEditPropertyScreen} options={{ title: 'Property' }} />
            <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Detail' }} />
            <Stack.Screen name="AddUnit" component={AddEditUnitScreen} options={{ title: 'Unit' }} />
            <Stack.Screen name="AddTenant" component={AddEditTenantScreen} options={{ title: 'Tenant' }} />
            <Stack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ title: 'Tenant Detail' }} />
            <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Record Payment' }} />
            <Stack.Screen name="ReminderPreview" component={ReminderPreviewScreen} options={{ title: 'Reminder' }} />
            <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} options={{ title: 'Receipt' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
