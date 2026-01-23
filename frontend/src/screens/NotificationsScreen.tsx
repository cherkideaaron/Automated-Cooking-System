import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Category = 'emergency' | 'warning' | 'info';

interface Notification {
  id: string;
  title: string;
  description: string;
  category: Category;
  timestamp: string;
  action?: string;
}

const notifications: Notification[] = [
  {
    id: '1',
    title: 'Emergency Stop Activated',
    description: 'Cooking session was interrupted due to emergency stop button',
    category: 'emergency',
    timestamp: '2 hours ago',
    action: 'Stove turned off immediately',
  },
  {
    id: '2',
    title: 'High Temperature Warning',
    description: 'Temperature exceeded safe threshold during cooking',
    category: 'warning',
    timestamp: '5 hours ago',
    action: 'System reduced temperature automatically',
  },
  {
    id: '3',
    title: 'Cooking Complete',
    description: 'Your Pasta Carbonara is ready to serve',
    category: 'info',
    timestamp: '1 day ago',
    action: 'Session saved to history',
  },
  {
    id: '4',
    title: 'System Update Available',
    description: 'A new firmware update is available for your machine',
    category: 'info',
    timestamp: '2 days ago',
    action: 'Update available in settings',
  },
  {
    id: '5',
    title: 'Sensor Calibration Needed',
    description: 'Temperature sensor requires recalibration for accuracy',
    category: 'warning',
    timestamp: '3 days ago',
    action: 'Calibration guide available',
  },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | Category>('all');

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === filter);

  const iconFor = (category: Category) => {
    if (category === 'emergency') return 'alert-circle';
    if (category === 'warning') return 'warning';
    return 'information-circle';
  };

  const colorFor = (category: Category) => {
    if (category === 'emergency') return '#E53935';
    if (category === 'warning') return '#FBC02D';
    return '#42A5F5';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <Ionicons name="notifications" size={22} color="#E53935" />
      </View>

      {/* FILTERS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
      >
        {['all', 'emergency', 'warning', 'info'].map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item as any)}
            style={[
              styles.filterBtn,
              { backgroundColor: filter === item ? '#E53935' : colors.card },
              filter === item && styles.filterActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === item ? '#fff' : colors.textSecondary },
                filter === item && { color: '#fff' },
              ]}
            >
              {item.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* LIST */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off" size={40} color="#666" />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        filtered.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderLeftColor: colorFor(item.category) },
            ]}
          >
            <Ionicons
              name={iconFor(item.category)}
              size={22}
              color={colorFor(item.category)}
              style={{ marginTop: 4 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>

              {item.action && (
                <Text style={[styles.cardAction, { color: colors.textSecondary }]}>
                  Action: {item.action}
                </Text>
              )}

              <Text style={styles.time}>{item.timestamp}</Text>
            </View>
          </View>
        ))
      )}

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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },

  filters: {
    marginBottom: 16,
  },

  filterBtn: {
    backgroundColor: '#16161E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },

  filterActive: {
    backgroundColor: '#E53935',
  },

  filterText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '700',
  },

  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#16161E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },

  cardTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },

  cardDesc: {
    color: '#aaa',
    fontSize: 13,
  },

  cardAction: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
  },

  time: {
    color: '#666',
    fontSize: 11,
    marginTop: 6,
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
  },

  emptyText: {
    color: '#777',
    marginTop: 10,
  },
});
