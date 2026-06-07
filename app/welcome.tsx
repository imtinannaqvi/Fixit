import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Welcome() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (token && user) {
          router.replace('/tabs/home');
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🔧</Text>
        </View>
        <Text style={styles.appName}>FixItNow</Text>
        <Text style={styles.tagline}>Your trusted home maintenance partner</Text>
        <View style={styles.divider} />
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureText}>Fast</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <Text style={styles.featureText}>Trusted</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🤖</Text>
            <Text style={styles.featureText}>AI Powered</Text>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <Text style={styles.bottomText}>Welcome 👋</Text>
        <Text style={styles.bottomSub}>Loading your experience...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  circle1: { position: 'absolute', width: 350, height: 350, borderRadius: 175, backgroundColor: '#0ea5e920', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#38bdf810', bottom: 50, left: -60 },
  content: { alignItems: 'center', paddingHorizontal: 40 },
  logoBox: { width: 100, height: 100, borderRadius: 28, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoIcon: { fontSize: 52 },
  appName: { fontSize: 42, fontWeight: 'bold', color: '#E5E7EB', marginBottom: 8, letterSpacing: 1 },
  tagline: { color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  divider: { width: 60, height: 3, backgroundColor: '#38BDF8', borderRadius: 2, marginVertical: 28 },
  featuresRow: { flexDirection: 'row', gap: 28 },
  featureItem: { alignItems: 'center', gap: 6 },
  featureIcon: { fontSize: 28 },
  featureText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  bottom: { position: 'absolute', bottom: 60, alignItems: 'center' },
  bottomText: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bottomSub: { color: '#475569', fontSize: 13 },
});