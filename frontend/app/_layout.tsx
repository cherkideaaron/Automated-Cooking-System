import { Stack } from 'expo-router';

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="splash2" />
            <Stack.Screen name="splash3" />
            <Stack.Screen name="splash4" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(dashboard)" />
        </Stack>
    );
}
