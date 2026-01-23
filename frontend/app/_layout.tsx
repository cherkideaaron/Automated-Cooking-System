import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../src/components/ToastConfig';
import { ThemeProvider as AppThemeProvider, useTheme } from '../src/context/ThemeContext';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <MainLayout />
    </AppThemeProvider>
  );
}

function MainLayout() {
  const { colors, isDark } = useTheme();

  const navTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
    fonts: DarkTheme.fonts
  };

  const currentTheme = isDark ? DarkTheme : navTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="splash2" />
          <Stack.Screen name="splash3" />
          <Stack.Screen name="splash4" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(dashboard)" />
        </Stack>
      </View>
      <Toast config={toastConfig} />
    </NavThemeProvider>
  );
}