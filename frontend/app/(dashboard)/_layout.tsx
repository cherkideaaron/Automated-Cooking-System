import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function CustomDrawerContent(props: any) {
    const router = useRouter();

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <DrawerItemList {...props} />
            </View>
            <DrawerItem
                label="Logout"
                icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color="red" />}
                onPress={() => {
                    // Navigate back to the start of the flow (Splash 1 or Login)
                    // Using replace to clear history if possible, or navigate
                    router.replace('./');
                }}
                style={styles.logoutItem}
                labelStyle={styles.logoutLabel}
            />
        </DrawerContentScrollView>
    );
}

export default function DashboardLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />}>
                <Drawer.Screen
                    name="(tabs)"
                    options={{
                        drawerLabel: 'Home',
                        title: 'Home',
                        drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
                    }}
                />
                <Drawer.Screen
                    name="monitoring"
                    options={{
                        drawerLabel: 'Monitoring',
                        title: 'Monitoring',
                        drawerIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
                    }}
                />
                <Drawer.Screen
                    name="custom"
                    options={{
                        drawerLabel: 'Custom',
                        title: 'Custom',
                        drawerIcon: ({ color, size }) => <Ionicons name="build-outline" size={size} color={color} />,
                    }}
                />
                <Drawer.Screen
                    name="notifications"
                    options={{
                        drawerLabel: 'Notifications',
                        title: 'Notifications',
                        drawerIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
                    }}
                />
                <Drawer.Screen
                    name="settings"
                    options={{
                        drawerLabel: 'Settings',
                        title: 'Settings',
                        drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
                    }}
                />
                <Drawer.Screen
                    name="about"
                    options={{
                        drawerLabel: 'About',
                        title: 'About',
                        drawerIcon: ({ color, size }) => <Ionicons name="information-circle-outline" size={size} color={color} />,
                    }}
                />
            </Drawer>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    logoutItem: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    logoutLabel: {
        color: 'red',
    }
})
