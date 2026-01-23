import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { usePayment } from '../context/PaymentContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { payments } = usePayment();
  const { colors, toggleTheme, isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {/* ACCOUNT */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>user@example.com</Text>

        <Text style={[styles.label, { marginTop: 12, color: colors.textSecondary }]}>Username</Text>
        <Text style={[styles.value, { color: colors.text }]}>Chef Master</Text>

        <Pressable
          style={styles.rowBtn}
          onPress={() => setShowPasswordModal(true)}
        >
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={[styles.rowText, { color: colors.text }]}>Change Password</Text>
        </Pressable>
      </View>

      {/* PREFERENCES */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Theme Toggle */}
        <View style={[styles.rowBetween, { marginBottom: 16 }]}>
          <View style={styles.row}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            thumbColor="#fff"
            trackColor={{ true: colors.primary, false: '#ccc' }}
          />
        </View>

        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.text }]}>Notifications</Text>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor="#fff"
            trackColor={{ true: colors.primary, false: '#333' }}
          />
        </View>
      </View>

      {/* PAYMENTS */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Payment History</Text>
      {payments.map((p) => (
        <View key={p.id} style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.value, { color: colors.text }]}>{p.recipeName}</Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>{p.date}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.value, { color: colors.text }]}>${p.amount.toFixed(2)}</Text>
              <Text
                style={[
                  styles.status,
                  p.status === 'approved' && { color: colors.success },
                  p.status === 'pending' && { color: colors.warning },
                  p.status === 'rejected' && { color: colors.error },
                ]}
              >
                {p.status}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* DATA */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          style={styles.dangerBtn}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash" size={18} color={colors.error} />
          <Text style={[styles.dangerText, { color: colors.error }]}>Delete All Recipes</Text>
        </Pressable>
      </View>

      {/* LOGOUT */}
      <Pressable style={[styles.logoutBtn, { backgroundColor: colors.primary }]}>
        <Ionicons name="log-out" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      {/* CHANGE PASSWORD MODAL */}
      <Modal transparent visible={showPasswordModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>

            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Password logic will be connected to Supabase later.
            </Text>

            <Pressable
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPasswordModal(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal transparent visible={showDeleteModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete All Recipes</Text>

            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              This action cannot be undone.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.error }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 16,
  },

  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
  },

  sectionTitle: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },

  card: {
    backgroundColor: '#16161E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  label: {
    color: '#777',
    fontSize: 12,
  },

  value: {
    color: '#fff',
    fontWeight: '600',
  },

  muted: {
    color: '#777',
    fontSize: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },

  rowText: {
    color: '#fff',
    fontWeight: '600',
  },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  dangerText: {
    color: '#E53935',
    fontWeight: '700',
  },

  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '800',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modal: {
    width: '100%',
    backgroundColor: '#16161E',
    borderRadius: 18,
    padding: 20,
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  modalText: {
    color: '#aaa',
    marginBottom: 20,
  },

  modalBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },

  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
