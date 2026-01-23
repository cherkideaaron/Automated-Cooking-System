import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MonitoringScreen() {
  const { colors } = useTheme();
  const handleRotateLeft = () => {
    console.log('Rotate camera left');
  };

  const handleRotateRight = () => {
    console.log('Rotate camera right');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* TITLE */}
      <Text style={[styles.pageTitle, { color: colors.text }]}>Live Monitoring</Text>

      {/* CAMERA FEED PLACEHOLDER */}
      <View style={[styles.cameraCard, { backgroundColor: colors.card }]}>
        <View style={[styles.cameraFeed, { backgroundColor: colors.inputBackground }]}>
          <View style={styles.cameraIcon} />
          <Text style={styles.cameraTitle}>ESP32 Camera Feed</Text>
          <Text style={[styles.cameraSub, { color: '#888' }]}>
            Live stream from your cooking machine
          </Text>
        </View>
      </View>

      {/* CONTROLS */}
      <View style={styles.controlsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleRotateLeft}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.controlText}>Rotate Left</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleRotateRight}
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.controlText}>Rotate Right</Text>
        </Pressable>
      </View>

      {/* CAMERA STATUS */}
      <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statusTitle, { color: colors.text }]}>Camera Status</Text>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Connection</Text>
          <Text style={[styles.statusValue, { color: '#4CAF50' }]}>
            Connected
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Resolution</Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>1920 × 1440</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Frame Rate</Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>30 FPS</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Signal Strength</Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>Excellent</Text>
        </View>
      </View>

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
    marginBottom: 16,
  },

  /* CAMERA */
  cameraCard: {
    backgroundColor: '#16161E',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
  },

  cameraFeed: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },

  cameraIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(229,57,53,0.2)',
    marginBottom: 12,
  },

  cameraTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  cameraSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  /* CONTROLS */
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  controlBtn: {
    flex: 1,
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  controlText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  /* STATUS */
  statusCard: {
    backgroundColor: '#16161E',
    borderRadius: 18,
    padding: 16,
  },

  statusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  statusLabel: {
    color: '#888',
    fontSize: 13,
  },

  statusValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
