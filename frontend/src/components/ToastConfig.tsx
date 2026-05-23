import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

export const toastConfig: ToastConfig = {
    success: (props) => (
        <BaseToast
            {...props}
            style={{ borderLeftColor: '#4CAF50', backgroundColor: '#1E1E26', borderLeftWidth: 6 }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#fff'
            }}
            text2Style={{
                fontSize: 14,
                color: '#aaa'
            }}
            renderLeadingIcon={() => (
                <View style={styles.iconContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                </View>
            )}
        />
    ),
    error: (props) => (
        <ErrorToast
            {...props}
            style={{ borderLeftColor: '#E53935', backgroundColor: '#1E1E26', borderLeftWidth: 6 }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#fff'
            }}
            text2Style={{
                fontSize: 14,
                color: '#aaa'
            }}
            renderLeadingIcon={() => (
                <View style={styles.iconContainer}>
                    <Ionicons name="alert-circle" size={24} color="#E53935" />
                </View>
            )}
        />
    ),
    info: (props) => (
        <BaseToast
            {...props}
            style={{ borderLeftColor: '#2196F3', backgroundColor: '#1E1E26', borderLeftWidth: 6 }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#fff'
            }}
            text2Style={{
                fontSize: 14,
                color: '#aaa'
            }}
            renderLeadingIcon={() => (
                <View style={styles.iconContainer}>
                    <Ionicons name="information-circle" size={24} color="#2196F3" />
                </View>
            )}
        />
    ),
};

const styles = StyleSheet.create({
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10,
    }
});
