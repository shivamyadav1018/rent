import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MoveOutScreen } from '../modules/settlements/MoveOutScreen';
import { SettlementsScreen } from '../modules/settlements/SettlementsScreen';
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
import { CreateTenantInviteScreen } from '../modules/tenants/CreateTenantInviteScreen';
import { TenantInvitesScreen } from '../modules/tenants/TenantInvitesScreen';
import { RecordPaymentScreen } from '../modules/payments/RecordPaymentScreen';
import { ReminderPreviewScreen } from '../modules/reminders/ReminderPreviewScreen';
import { ReceiptPreviewScreen } from '../modules/receipts/ReceiptPreviewScreen';
import { TenantInviteCodeScreen } from '../modules/tenantGuest/TenantInviteCodeScreen';
import { TenantApplicationScreen } from '../modules/tenantGuest/TenantApplicationScreen';
import { TenantSubmissionScreen } from '../modules/tenantGuest/TenantSubmissionScreen';
import { TenantApplicationsScreen } from '../modules/tenants/TenantApplicationsScreen';
import { ReviewTenantApplicationScreen } from '../modules/tenants/ReviewTenantApplicationScreen';
import { AppOpenAdGate } from '../components/AppOpenAdGate';
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
  TenantInvites: undefined;
  CreateTenantInvite: { unitId?: string } | undefined;
  TenantApplications: undefined;
  ReviewTenantApplication: { applicationId: string };
  TenantInviteCode: undefined;
  TenantApplication: { code: string };
  TenantSubmission: { applicationId?: string } | undefined;
  MoveOut: { tenantId: string };
  Settlements: undefined;
  RecordPayment: { tenantId?: string; cycleId?: string } | undefined;
  ReminderPreview: { cycleId: string };
  ReceiptPreview: { cycleId: string; paymentId?: string; amountPaid?: number; paymentMode?: string; paymentDate?: string; referenceNo?: string; notes?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const onboardingDone = useAppStore(state => state.onboardingDone);
  const authStatus = useAuthStore(state => state.status);
  const offlineMode = useAuthStore(state => state.offlineMode);
  const role = useAuthStore(state => state.role);
  const hasOwnerAccess = role === 'owner' && (authStatus === 'signedIn' || offlineMode);
  const hasTenantAccess = role === 'tenant' && authStatus === 'signedIn';

  if (authStatus === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const flow = hasTenantAccess ? 'tenant' : !hasOwnerAccess ? 'signedOut' : onboardingDone ? 'app' : 'setup';

  return (
    <NavigationContainer key={flow}>
      <Stack.Navigator
        initialRouteName={hasTenantAccess ? 'TenantInviteCode' : !hasOwnerAccess ? 'Welcome' : onboardingDone ? 'MainTabs' : 'LandlordSetup'}
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily, fontSize: 18, fontWeight: '700' },
        }}>
        {hasTenantAccess ? (
          <>
            <Stack.Screen name="TenantInviteCode" component={TenantInviteCodeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TenantApplication" component={TenantApplicationScreen} options={{ title: 'Tenant Registration' }} />
            <Stack.Screen name="TenantSubmission" component={TenantSubmissionScreen} options={{ headerShown: false }} />
          </>
        ) : !hasOwnerAccess ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        ) : !onboardingDone ? (
          <Stack.Screen
            name="LandlordSetup"
            component={LandlordSetupScreen}
            options={{
              title: 'Landlord Profile',
              headerBackVisible: false,
              headerStyle: { backgroundColor: authColors.background },
              headerTintColor: authColors.ink,
              headerTitleStyle: { fontFamily, fontSize: 18, fontWeight: '700', color: authColors.ink },
            }}
          />
        ) : (
          <>
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
            </Stack.Group>
            <Stack.Group>
              <Stack.Screen name="AddProperty" component={AddEditPropertyScreen} options={({ route }) => ({ title: route.params?.propertyId ? 'Edit Property' : 'Add Property' })} />
              <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Detail' }} />
              <Stack.Screen name="AddUnit" component={AddEditUnitScreen} options={{ title: 'Unit' }} />
              <Stack.Screen name="AddTenant" component={AddEditTenantScreen} options={({ route }) => ({ title: route.params?.tenantId ? 'Edit Tenant' : 'Add New Tenant' })} />
              <Stack.Screen name="MoveOut" component={MoveOutScreen} options={{ title: 'Move-out settlement' }} />
              <Stack.Screen name="Settlements" component={SettlementsScreen} options={{ title: 'Settlements' }} />
              <Stack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ title: 'Tenant Detail' }} />
              <Stack.Screen name="TenantInvites" component={TenantInvitesScreen} options={{ title: 'Tenant Invites' }} />
              <Stack.Screen name="CreateTenantInvite" component={CreateTenantInviteScreen} options={{ title: 'Invite Tenant' }} />
              <Stack.Screen name="TenantApplications" component={TenantApplicationsScreen} options={{ title: 'Tenant Requests' }} />
              <Stack.Screen name="ReviewTenantApplication" component={ReviewTenantApplicationScreen} options={{ title: 'Review Request' }} />
              <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Record Payment' }} />
              <Stack.Screen name="ReminderPreview" component={ReminderPreviewScreen} options={{ title: 'Reminder' }} />
              <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} options={{ title: 'Receipt' }} />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
      {flow === 'app' ? <AppOpenAdGate /> : null}
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
