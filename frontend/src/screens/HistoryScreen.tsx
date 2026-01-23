import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CookingSession {
  id: string;
  foodName: string;
  date: string;
  duration: number;
  status: 'completed' | 'interrupted';
}

const mockHistory: CookingSession[] = [
  { id: '1', foodName: 'Pasta Carbonara', date: '2024-01-20', duration: 25, status: 'completed' },
  { id: '2', foodName: 'Vegetable Stir Fry', date: '2024-01-19', duration: 15, status: 'completed' },
  { id: '3', foodName: 'Rice Pilaf', date: '2024-01-18', duration: 30, status: 'completed' },
  { id: '4', foodName: 'Soup', date: '2024-01-17', duration: 40, status: 'interrupted' },
  { id: '5', foodName: 'Grilled Vegetables', date: '2024-01-16', duration: 20, status: 'completed' },
];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const stats = {
    mostCooked: 'Pasta Carbonara',
    totalTime: mockHistory.reduce((acc, s) => acc + s.duration, 0),
    cookingCount: mockHistory.length,
  };

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

      {mockHistory.map((session) => {
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

              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                Duration: {session.duration} min
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'close-circle'}
                size={22}
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
          </Pressable>
        );
      })}

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
    marginTop: 4,
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
});
