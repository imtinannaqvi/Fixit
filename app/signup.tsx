import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function Signup() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('homeowner');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role, phone.trim());
      Toast.show({ type: 'success', text1: '🎉 Account Created!', text2: 'Please verify your email' });
      setTimeout(() => {
        router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
      }, 1000);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Signup Failed', text2: err?.response?.data?.msg || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ FIX: KeyboardAvoidingView and ScrollView on separate lines — no stray spaces
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔧</Text>
          <Text style={styles.logoText}>FixItNow</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FixItNow today</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

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
            placeholder="Create a password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0300-1234567"
            placeholderTextColor="#64748B"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleBtn, role === 'homeowner' && styles.roleActive]}
              onPress={() => setRole('homeowner')}
            >
              <Text style={styles.roleIcon}>🏠</Text>
              <Text style={[styles.roleText, role === 'homeowner' && styles.roleTextActive]}>Homeowner</Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'technician' && styles.roleActive]}
              onPress={() => setRole('technician')}
            >
              <Text style={styles.roleIcon}>🔧</Text>
              <Text style={[styles.roleText, role === 'technician' && styles.roleTextActive]}>Technician</Text>
            </Pressable>
          </View>

          <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0F172A" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </Pressable>

          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 60 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoIcon: { fontSize: 50, marginBottom: 8 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#38BDF8' },
  form: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E5E7EB', marginBottom: 4 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: { flex: 1, backgroundColor: '#0F172A', padding: 14, borderRadius: 12, alignItems: 'center' },
  roleActive: { backgroundColor: '#38BDF8' },
  roleIcon: { fontSize: 24, marginBottom: 4 },
  roleText: { color: '#64748B', fontWeight: '600' },
  roleTextActive: { color: '#0F172A' },
  button: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#64748B', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#38BDF8', fontWeight: 'bold' },
});