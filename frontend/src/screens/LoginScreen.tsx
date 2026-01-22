import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();

  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    // simulate login
    setTimeout(() => {
      setLoading(false);
      router.replace('./(dashboard)');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={28} color="#E53935" />
          </View>

          <Text style={styles.title}>Smart Cooker</Text>
          <Text style={styles.subtitle}>
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </Text>
        </View>

        {/* Form */}
        {!isSignIn && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              placeholder="John Doe"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordRow}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#888"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
            />

            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#aaa"
              />
            </Pressable>
          </View>
        </View>

        {/* Submit */}
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryText}>
            {loading
              ? 'Loading...'
              : isSignIn
              ? 'Sign In'
              : 'Create Account'}
          </Text>
        </Pressable>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}
          </Text>

          <Pressable onPress={() => setIsSignIn(!isSignIn)}>
            <Text style={styles.toggleLink}>
              {isSignIn ? ' Sign Up' : ' Sign In'}
            </Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.line} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn}>
            <Text style={styles.socialText}>Google</Text>
          </Pressable>

          <Pressable style={styles.socialBtn}>
            <Text style={styles.socialText}>Apple</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#15151C',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(229,57,53,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#aaa',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#ccc',
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1F1F2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F2A',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
  },
  primaryBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  toggleText: {
    color: '#aaa',
  },
  toggleLink: {
    color: '#E53935',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  dividerText: {
    color: '#777',
    fontSize: 11,
    marginHorizontal: 8,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  socialText: {
    color: '#fff',
    fontWeight: '500',
  },
});
