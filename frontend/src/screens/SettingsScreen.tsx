import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { usePayment } from '../context/PaymentContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { recipeService } from '../services/recipeService';

const GEMINI_API_KEY_STORAGE = '@gemini_api_key';

export default function SettingsScreen() {
  const { payments } = usePayment();
  const { colors, toggleTheme, isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
    loadProfile();
    loadIncomingRequests();
  }, []);

  const loadProfile = async () => {
    const profile = await recipeService.getUserProfile();
    if (profile) {
      setUsername(profile.username || '');
      setUserEmail(profile.email || '');
    }
  };

  const loadIncomingRequests = async () => {
    const reqs = await recipeService.getIncomingPurchaseRequests();
    setIncomingRequests(reqs);
  };

  const loadApiKey = async () => {
    try {
      const savedKey = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
      if (savedKey) {
        setApiKey(savedKey);
        setApiKeyInput(savedKey);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const saveApiKey = async () => {
    try {
      if (apiKeyInput.trim()) {
        await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, apiKeyInput.trim());
        setApiKey(apiKeyInput.trim());
        Toast.show({
          type: 'success',
          text1: 'API Key Saved',
          text2: 'Your Gemini API key has been saved',
          position: 'bottom'
        });
      } else {
        await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE);
        setApiKey('');
        Toast.show({
          type: 'success',
          text1: 'API Key Removed',
          position: 'bottom'
        });
      }
      setShowApiKeyModal(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save API key',
        position: 'bottom'
      });
    }
  };

  const handleSaveProfile = async () => {
    const success = await recipeService.updateProfile(username);
    if (success) {
      setIsEditingProfile(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated'
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Update Failed'
      });
    }
  };

  const handleLogout = async () => {
    const { error } = await (authService as any).signOut();
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Logout Failed',
        text2: error.message
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'See you soon!'
      });
      // In a real app, you'd navigate back to Login or reset the session state
    }
  };

  const handleApproveRequest = async (buyerId: string, recipeId: string) => {
    const success = await recipeService.approvePurchaseRequest(buyerId, recipeId);
    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Request Approved'
      });
      // Refresh list
      loadIncomingRequests();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Approval Failed'
      });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {/* ACCOUNT */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>{userEmail || 'Loading...'}</Text>

        <Text style={[styles.label, { marginTop: 12, color: colors.textSecondary }]}>Username</Text>

        {isEditingProfile ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              value={username}
              onChangeText={setUsername}
              autoFocus
            />
            <Pressable onPress={handleSaveProfile} style={styles.saveIconBtn}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </Pressable>
            <Pressable onPress={() => setIsEditingProfile(false)} style={styles.saveIconBtn}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.rowBetween}>
            <Text style={[styles.value, { color: colors.text }]}>{username || 'Loading...'}</Text>
            <Pressable onPress={() => setIsEditingProfile(true)}>
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.rowBtn, { opacity: 0.5 }]}
          onPress={() => Toast.show({ type: 'info', text1: 'Feature Coming Soon', text2: 'Password reset is handled via email.' })}
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

      {/* INCOMING REQUESTS (For Sellers) */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Incoming Purchase Requests</Text>
      {incomingRequests.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>No pending requests</Text>
        </View>
      ) : (
        incomingRequests.map((req) => (
          <View key={req.id} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.value, { color: colors.text }]}>{req.recipes?.name}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>Buyer: {req.buyer?.username || 'Unknown'}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>Phone: {req.phone_number}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.value, { color: colors.primary }]}>${req.amount_paid}</Text>
                {req.status === 'pending' ? (
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: colors.success }]}
                    onPress={() => handleApproveRequest(req.buyer_id, req.recipe_id)}
                  >
                    <Text style={styles.smallBtnText}>Approve</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>Approved</Text>
                )}
              </View>
            </View>
          </View>
        ))
      )}

      {/* AI INTEGRATION */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AI Integration</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          style={styles.rowBtn}
          onPress={() => {
            setApiKeyInput(apiKey);
            setShowApiKeyModal(true);
          }}
        >
          <Ionicons name="key" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: colors.text }]}>Gemini API Key</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>
              {apiKey ? '••••••••••••' + apiKey.slice(-4) : 'Not configured'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
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
      <Pressable
        style={[styles.logoutBtn, { backgroundColor: colors.error }]}
        onPress={handleLogout}
      >
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

      {/* API KEY MODAL */}
      <Modal transparent visible={showApiKeyModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Gemini API Key</Text>

            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Enter your Gemini API key to enable AI-powered recipe generation.
            </Text>

            <TextInput
              style={[styles.apiKeyInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="Enter your Gemini API key"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowApiKeyModal(false);
                  setApiKeyInput(apiKey);
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveApiKey}
              >
                <Text style={styles.modalBtnText}>Save</Text>
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

  apiKeyInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
    fontSize: 14,
  },
  editInput: {
    flex: 1,
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: 4
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  saveIconBtn: {
    padding: 4
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  }
});
