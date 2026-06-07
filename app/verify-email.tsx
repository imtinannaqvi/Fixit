import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_URL } from '../config';

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter 6-digit OTP' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/verify-email`, { email, otp });
      Toast.show({ type: 'success', text1: '✅ Email Verified!', text2: 'You can now use FixItNow' });
      setTimeout(() => router.replace('/tabs/home'), 1000);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.msg || 'Invalid OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, { email });
      Toast.show({ type: 'success', text1: '📧 OTP Resent!', text2: 'Check terminal for preview link' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.msg || 'Failed to resend' });
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
        <Text style={styles.email}>{email}</Text>

        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP"
          placeholderTextColor="#64748B"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Pressable style={styles.btn} onPress={handleVerify} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0F172A" />
            : <Text style={styles.btnText}>✅ Verify Email</Text>
          }
        </Pressable>

        <Pressable onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          <Text style={styles.resendText}>
            {resending ? 'Resending...' : "Didn't receive code? Resend"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/tabs/home')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now →</Text>
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
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 4 },
  email: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold', marginBottom: 24 },
  otpInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 16, borderRadius: 14, fontSize: 24, textAlign: 'center', letterSpacing: 8, width: '100%', marginBottom: 20 },
  btn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', width: '100%', marginBottom: 16 },
  btnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  resendBtn: { marginBottom: 12 },
  resendText: { color: '#38BDF8', fontSize: 14 },
  skipBtn: { marginTop: 4 },
  skipText: { color: '#64748B', fontSize: 13 },
});