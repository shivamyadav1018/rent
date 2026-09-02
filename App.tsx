import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'react-native-elements';
import type { Theme } from 'react-native-elements';

import { AppNavigator } from './src/app/AppNavigator';
import { initializeDatabase } from './src/database/db';
import { useAppStore } from './src/store/appStore';
import { useAuthStore } from './src/store/authStore';
import { colors, elementsTheme } from './src/theme';

const ElementsThemeProvider = ThemeProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{ theme: Theme }>
>;

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [ready, setReady] = useState(false);
  const bootstrap = useAppStore(state => state.bootstrap);
  const initializeAuth = useAuthStore(state => state.initialize);

  useEffect(() => {
    let unsubscribeAuth: () => void = () => {};
    const start = async () => {
      await initializeDatabase();
      await bootstrap();
      unsubscribeAuth = initializeAuth();
      setReady(true);
    };

    start();
    return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount; bootstrap/initializeAuth are stable Zustand refs

  return (
    <SafeAreaProvider>
      <ElementsThemeProvider theme={elementsTheme}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {ready ? (
          <AppNavigator />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ElementsThemeProvider>
    </SafeAreaProvider>
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

export default App;
