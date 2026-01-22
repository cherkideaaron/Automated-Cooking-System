import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Splash4Screen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        <View style={[styles.bar, styles.active]} />
        <View style={[styles.bar, styles.active]} />
        <View style={[styles.bar, styles.active]} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time" size={42} color="#E53935" />
        </View>

        <Text style={styles.title}>Automatic Timing</Text>
        <Text style={styles.desc}>
          Set cooking duration and get notified exactly when your meal is ready.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/login')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 24,
    justifyContent: 'space-between',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  bar: {
    width: 20,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  active: {
    width: 32,
    backgroundColor: '#E53935',
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(229,57,53,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
