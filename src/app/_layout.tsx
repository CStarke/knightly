import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoginScreen } from '@/components/login-screen';
import { Brand, Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ClubFollowProvider } from '@/context/club-follow-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: '#0B0C0E',
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
        <AuthProvider>
          <ClubFollowProvider>
            <RootNavigator isDark={isDark} />
          </ClubFollowProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ isDark }: { isDark: boolean }) {
  const { isAuthenticated, isAppMounted } = useAuth();

  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: !isAuthenticated ? Brand.maroon : '#0B0C0E' },
      ]}>
      <StatusBar style={!isAuthenticated ? 'light' : isDark ? 'light' : 'dark'} />

      {/* Main app is only loaded once sign-in is submitted and background is ready */}
      {isAppMounted && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#0B0C0E',
            },
          }}>
          <Stack.Screen name="(tabs)" />
          {/* Lives above the tab bar so the ID really does fill the screen. */}
          <Stack.Screen
            name="card"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen
            name="clubs/index"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="clubs/[id]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="login"
            options={{ animation: 'fade' }}
          />
        </Stack>
      )}

      {/* Startup Login Screen: full maroon, ensures no bottom bar or tabs show on startup */}
      {!isAuthenticated && <LoginScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
