import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'react-native-elements';
import type { Theme } from 'react-native-elements';

import { AppNavigator } from './src/app/AppNavigator';
import { useAppStartup } from './src/app/useAppStartup';
import { AppButton } from './src/components/AppButton';
import { Body, Title } from './src/components/Typography';
import { colors, elementsTheme } from './src/theme';

const ElementsThemeProvider = ThemeProvider as unknown as React.ComponentType<
  React.PropsWithChildren<{ theme: Theme }>
>;

function App() {
  const { ready, error, retry } = useAppStartup();

  return (
    <SafeAreaProvider>
      <ElementsThemeProvider theme={elementsTheme}>
        <StatusBar barStyle="dark-content" />
        {ready ? (
          <AppNavigator />
        ) : (
          <View style={styles.loading}>
            {error ? (
              <>
                <Title>Could not start the app</Title>
                <Body>{error}</Body>
                <AppButton title="Retry" onPress={retry} />
              </>
            ) : <ActivityIndicator size="large" color={colors.primary} />}
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
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});

export default App;
