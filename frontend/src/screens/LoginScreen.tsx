import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* TOP HEADER SECTION */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={32} color="#E53935" />
            </View>
            <Text style={styles.title}>Smart Cooker</Text>
            <Text style={styles.subtitle}>
              {isSignIn ? 'Sign in to your kitchen' : 'Join the smart cooking revolution'}
            </Text>
          </View>

          {/* FORM SECTION */}
          <View style={styles.form}>
            {!isSignIn && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor="#555"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#555"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#888"
                  />
                </Pressable>
              </View>
            </View>

            {isSignIn && (
              <Pressable style={styles.forgotPass}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}

            {/* PRIMARY BUTTON */}
            <Pressable 
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryText}>
                {loading ? 'Processing...' : isSignIn ? 'Sign In' : 'Create Account'}
              </Text>
            </Pressable>

            {/* TOGGLE LINK */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isSignIn ? "New here?" : 'Already a member?'}
              </Text>
              <Pressable onPress={() => setIsSignIn(!isSignIn)}>
                <Text style={styles.toggleLink}>
                  {isSignIn ? ' Create Account' : ' Sign In'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SOCIAL SECTION */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn}>
                <FontAwesome name="google" size={24} color="#fff" />
              </Pressable>

              <Pressable style={styles.socialBtn}>
                <FontAwesome name="apple" size={24} color="#fff" />
              </Pressable>

              <Pressable style={styles.socialBtn}>
                <FontAwesome name="facebook" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F', // Main Dark Background
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
  },
  /* HEADER */
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(229,57,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#888',
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
  },
  /* FORM */
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#eee',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#16161E', // Slightly lighter dark
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#fff',
    fontSize: 15,
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  toggleText: {
    color: '#888',
    fontSize: 14,
  },
  toggleLink: {
    color: '#E53935',
    fontWeight: '700',
    fontSize: 14,
  },
  /* FOOTER & SOCIAL */
  footer: {
    marginTop: 40,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16161E',
    borderWidth: 1,
    borderColor: '#2A2A32',
    alignItems: 'center',
    justifyContent: 'center',
  },
});