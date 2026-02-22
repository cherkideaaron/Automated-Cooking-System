import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type Category = 'emergency' | 'warning' | 'info';

interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  type: Category;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (supabase
      .from('notifications') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as DbNotification[]);
    }
    setLoading(false);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase
      .from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      markAllAsRead();
    }, [])
  );

  useEffect(() => {
    const subscription = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          fetchNotifications();
          // We mark as read only if the screen is currently focused
          // But since we are inside NotificationsScreen, we expect the user to see it
          markAllAsRead();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const iconFor = (category: Category) => {
    if (category === 'emergency') return 'alert-circle' as const;
    if (category === 'warning') return 'warning' as const;
    return 'information-circle' as const;
  };

  const colorFor = (category: Category) => {
    if (category === 'emergency') return '#E53935';
    if (category === 'warning') return '#FBC02D';
    return '#42A5F5';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

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
              { backgroundColor: colors.card, borderLeftColor: colorFor(item.type) },
            ]}
          >
            <Ionicons
              name={iconFor(item.type)}
              size={22}
              color={colorFor(item.type)}
              style={{ marginTop: 4 }}
            />

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {item.type === 'emergency' ? 'Emergency' : item.type === 'warning' ? 'Warning' : 'Info'}
                </Text>
                {!item.is_read && <View style={styles.unreadDot} />}
              </View>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.message}</Text>

              <Text style={styles.time}>{formatTimestamp(item.created_at)}</Text>
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

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
});
