import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_URL } from '../config';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Enter your email' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      Toast.show({ type: 'success', text1: '📧 Reset code sent!', text2: 'Check terminal for preview link' });
      setTimeout(() => router.push({ pathname: '/reset-password', params: { email } }), 1000);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.msg || 'Failed to send' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔑</Text>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset code</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#64748B"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Pressable style={styles.btn} onPress={handleSend} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0F172A" />
            : <Text style={styles.btnText}>📧 Send Reset Code</Text>
          }
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 28, alignItems: 'center' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { color: '#E5E7EB', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15, width: '100%', marginBottom: 20 },
  btn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', width: '100%', marginBottom: 16 },
  btnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  backBtn: { marginTop: 4 },
  backText: { color: '#38BDF8', fontSize: 14 },
});