import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/app/AppNavigator';
import { initializeDatabase } from './src/database/db';
import { useAppStore } from './src/store/appStore';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [ready, setReady] = useState(false);
  const bootstrap = useAppStore(state => state.bootstrap);

  useEffect(() => {
    const start = async () => {
      await initializeDatabase();
      await bootstrap();
      setReady(true);
    };

    start();
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {ready ? (
        <AppNavigator />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#f7f7f2',
    flex: 1,
    justifyContent: 'center',
  },
});

export default App;
