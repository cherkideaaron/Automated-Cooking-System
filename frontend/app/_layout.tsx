import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { View } from 'react-native';

// Define a custom theme that strictly uses your dark color
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0B0F',
    card: '#0B0B0F',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={CustomDarkTheme}>
      {/* We also add a background color to a wrapping View 
        just in case the ThemeProvider has a frame delay 
      */}
      <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Keep this as a secondary layer of protection
            contentStyle: { backgroundColor: '#0B0B0F' },
            // This forces the animation to not show underlying layers
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
    </ThemeProvider>
  );
}