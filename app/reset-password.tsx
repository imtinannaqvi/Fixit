import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { API_URL } from '../config';

export default function ResetPassword() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp || otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter 6-digit OTP' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { email, otp, newPassword });
      Toast.show({ type: 'success', text1: '✅ Password Reset!', text2: 'Login with your new password' });
      setTimeout(() => router.replace('/login'), 1000);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.msg || 'Failed to reset' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the code sent to</Text>
        <Text style={styles.email}>{email}</Text>

        <TextInput
          style={styles.otpInput}
          placeholder="6-digit OTP"
          placeholderTextColor="#64748B"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#64748B"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="#64748B"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Pressable style={styles.btn} onPress={handleReset} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0F172A" />
            : <Text style={styles.btnText}>🔐 Reset Password</Text>
          }
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
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
  otpInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 16, borderRadius: 14, fontSize: 24, textAlign: 'center', letterSpacing: 8, width: '100%', marginBottom: 16 },
  input: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15, width: '100%', marginBottom: 16 },
  btn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', width: '100%', marginBottom: 16 },
  btnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  backBtn: { marginTop: 4 },
  backText: { color: '#38BDF8', fontSize: 14 },
});