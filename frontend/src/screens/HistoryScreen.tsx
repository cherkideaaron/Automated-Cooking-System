import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

interface CookingSession {
  id: string;
  foodName: string;
  date: string;
  duration: number;
  status: 'completed' | 'stopped';
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [history, setHistory] = useState<CookingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);

  // Use focus effect to ensure history is updated every time we navigate here
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('cooking_sessions')
        .select(`
          id,
          status,
          created_at,
          steps,
          recipes (
            name
          )
        `)
        .neq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformed: CookingSession[] = (data as any[]).map(session => {
          const steps = session.steps as any[] || [];
          const totalDuration = steps.reduce((acc, step) => acc + (step.duration || 0), 0);

          return {
            id: session.id,
            foodName: session.recipes?.name || 'Deleted Recipe',
            date: session.created_at,
            duration: Math.round(totalDuration / 60),
            status: session.status as 'completed' | 'stopped'
          };
        });
        setHistory(transformed);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const { error } = await supabase
        .from('cooking_sessions')
        .delete()
        .eq('id', sessionToDelete.id);

      if (error) throw error;

      // Optimistic local update
      setHistory(prev => prev.filter(s => s.id !== sessionToDelete.id));
      setSessionToDelete(null);
    } catch (err) {
      console.error('Error deleting history:', err);
      // We could use a toast here if available, but for now we'll just log
    }
  };

  const calculateStats = () => {
    if (history.length === 0) return { mostCooked: 'None', totalTime: 0, cookingCount: 0 };

    const totalTime = history.reduce((acc, s) => acc + s.duration, 0);
    const cookingCount = history.length;

    // Find most cooked
    const frequency: Record<string, number> = {};
    history.forEach(s => {
      frequency[s.foodName] = (frequency[s.foodName] || 0) + 1;
    });

    let mostCooked = 'None';
    let max = 0;
    Object.keys(frequency).forEach(name => {
      if (frequency[name] > max) {
        max = frequency[name];
        mostCooked = name;
      }
    });

    return { mostCooked, totalTime, cookingCount };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* PAGE TITLE */}
      <Text style={[styles.pageTitle, { color: colors.text }]}>Cooking History</Text>

      {/* SUMMARY STATS */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="restaurant" size={22} color="#E53935" />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Most Cooked</Text>
          <Text style={[styles.statValueSmall, { color: colors.text }]}>{stats.mostCooked}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="time" size={22} color="#E53935" />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Time</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalTime}m</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="calendar" size={22} color="#E53935" />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Cooks</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.cookingCount}</Text>
        </View>
      </View>

      {/* HISTORY LIST */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Past Sessions</Text>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="restaurant-outline" size={48} color="#444" />
          <Text style={styles.emptyText}>No history yet.</Text>
        </View>
      ) : (
        history.map((session) => {
          const isCompleted = session.status === 'completed';

          return (
            <Pressable
              key={session.id}
              style={[styles.historyCard, { backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/recipes', params: { search: session.foodName } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: colors.text }]}>{session.foodName}</Text>

                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {new Date(session.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>

                <View style={styles.sessionDetailsRow}>
                  <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                    Duration: {session.duration} min
                  </Text>

                  <View style={styles.statusRow}>
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={isCompleted ? '#4CAF50' : '#E53935'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isCompleted ? '#4CAF50' : '#E53935' },
                      ]}
                    >
                      {isCompleted ? 'Success' : 'Stopped'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.rightContent}>
                <TouchableOpacity
                  onPress={() => setSessionToDelete({ id: session.id, name: session.foodName })}
                  style={[styles.deleteButton, { backgroundColor: colors.background }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Pressable>
          );
        })
      )}

      <View style={{ height: 40 }} />

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={!!sessionToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionToDelete(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash" size={48} color="#E53935" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
              Delete History
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to remove "{sessionToDelete?.name}" from your history?
            </Text>

            <View style={styles.confirmModalButtons}>
              <Pressable
                onPress={() => setSessionToDelete(null)}
                style={[styles.confirmModalButton, styles.modalButtonCancel, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteSession}
                style={[styles.confirmModalButton, styles.modalButtonConfirm]}
              >
                <Text style={[styles.confirmModalButtonText, styles.modalButtonTextConfirm]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 16,
  },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },

  /* STATS */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  statCard: {
    backgroundColor: '#16161E',
    width: '31%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },

  statLabel: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 6,
  },

  statValue: {
    color: '#E53935',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  statValueSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  /* LIST */
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#16161E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },

  foodName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  dateText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },

  durationText: {
    color: '#aaa',
    fontSize: 13,
  },

  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },

  rightContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },

  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    backgroundColor: '#16161E',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  emptyText: {
    color: '#777',
    fontSize: 15,
    marginTop: 12,
    fontWeight: '600',
  },

  // Confirm Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonConfirm: {
    backgroundColor: '#E53935',
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextConfirm: {
    color: '#fff',
  },
});
