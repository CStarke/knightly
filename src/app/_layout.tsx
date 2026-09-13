import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.backgroundElement,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElement,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    // Required for the tab fling gesture to reach the handlers on Android.
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <ThemeProvider value={isDark ? darkTheme : lightTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/* Lives above the tab bar so the ID really does fill the screen. */}
          <Stack.Screen
            name="card"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
