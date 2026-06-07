import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      const savedUser = await AsyncStorage.getItem('user');
      const userData = JSON.parse(savedUser || '{}');
      Toast.show({ type: 'success', text1: '👋 Welcome Back!', text2: 'Login successful' });
      setTimeout(() => {
        router.replace('/tabs/home');
      }, 1000);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: err?.response?.data?.msg || 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔧</Text>
          <Text style={styles.logoText}>FixItNow</Text>
          <Text style={styles.tagline}>Your trusted home repair partner</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Forgot Password */}
          <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>🔑 Forgot Password?</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0F172A" />
              : <Text style={styles.buttonText}>Login</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 60, marginBottom: 8 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#38BDF8' },
  tagline: { color: '#64748B', fontSize: 14, marginTop: 4 },
  form: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E5E7EB', marginBottom: 4 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 15 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { color: '#38BDF8', fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#64748B', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#38BDF8', fontWeight: 'bold' },
});