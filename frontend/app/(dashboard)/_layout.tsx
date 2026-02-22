import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../../src/lib/supabase';

function CustomDrawerContent(props: any) {
    const router = useRouter();

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
            {/* Machine Name Header */}
            <View style={styles.machineHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="restaurant" size={32} color="#E53935" />
                </View>
                <Text style={styles.machineName}>AutoChef Pro</Text>
                <Text style={styles.machineSubtitle}>Smart Cooking System</Text>
            </View>

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

import { PaymentProvider } from '../../src/context/PaymentContext';

export default function DashboardLayout() {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchUnreadCount();

        const subscription = supabase
            .channel('unread-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUnreadCount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (!error && count !== null) {
            setUnreadCount(count);
        }
    };

    return (
        <PaymentProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Drawer
                    drawerContent={(props) => <CustomDrawerContent {...props} />}
                    screenOptions={{
                        headerRight: () => (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16, gap: 16 }}>
                                <TouchableOpacity
                                    style={{ position: 'relative' }}
                                    onPress={() => router.push('/notifications')}
                                >
                                    <Ionicons name="notifications-outline" size={24} color="#fff" />
                                    {unreadCount > 0 && (
                                        <View style={{
                                            position: 'absolute',
                                            top: -4,
                                            right: -4,
                                            backgroundColor: '#E53935',
                                            minWidth: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            borderWidth: 1.5,
                                            borderColor: '#15151C',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            paddingHorizontal: 2
                                        }}>
                                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <Ionicons name="person-circle-outline" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ),
                        headerStyle: {
                            backgroundColor: '#15151C',
                            elevation: 0,
                            shadowOpacity: 0,
                            borderBottomWidth: 1,
                            borderBottomColor: '#2a2a2a',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: '700',
                            fontSize: 18,
                        }
                    }}
                >
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
        </PaymentProvider>
    );
}

const styles = StyleSheet.create({
    machineHeader: {
        padding: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        marginBottom: 8,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#15151C',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E53935',
    },
    machineName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    machineSubtitle: {
        fontSize: 13,
        color: '#aaa',
    },
    logoutItem: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    logoutLabel: {
        color: 'red',
    }
})
