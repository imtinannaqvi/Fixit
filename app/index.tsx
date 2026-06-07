import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '🤖', title: 'AI Diagnosis', desc: 'Upload a photo and our AI instantly identifies your home issue' },
  { icon: '🔍', title: 'Find Technicians', desc: 'Browse verified professionals by skill, location and rating' },
  { icon: '📅', title: 'Easy Booking', desc: 'Book a technician in minutes with real-time confirmation' },
  { icon: '⭐', title: 'Reviews & Ratings', desc: 'Read genuine reviews from verified customers' },
  { icon: '🔔', title: 'Real-time Updates', desc: 'Get instant notifications on your booking status' },
  { icon: '🛡️', title: 'Verified Experts', desc: 'All technicians are verified and background checked' },
];

const SERVICES = [
  { icon: '🔧', label: 'Plumber' },
  { icon: '⚡', label: 'Electrician' },
  { icon: '🪚', label: 'Carpenter' },
  { icon: '🎨', label: 'Painter' },
  { icon: '❄️', label: 'AC Technician' },
];

export default function Landing() {
  const router = useRouter();
  const { token, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.replace('/tabs/home');
      } else {
        setReady(true);
      }
    }
  }, [token, loading]);

  // 👇 show dark screen while checking auth — prevents flash
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#0F172A' }} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Text style={styles.topLogo}>🔧 FixItNow</Text>
        <View style={styles.topBtns}>
          <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </Pressable>
          <Pressable style={styles.signupBtn} onPress={() => router.push('/signup')}>
            <Text style={styles.signupBtnText}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🏠</Text>
        <Text style={styles.heroTitle}>Your Home,{'\n'}Our Expertise</Text>
        <Text style={styles.heroSubtitle}>Pakistan's smartest home maintenance app. AI-powered diagnosis meets verified technicians.</Text>
        <Pressable style={styles.heroBtn} onPress={() => router.push('/signup')}>
          <Text style={styles.heroBtnText}>Get Started Free →</Text>
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>500+</Text><Text style={styles.statLabel}>Technicians</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>10k+</Text><Text style={styles.statLabel}>Jobs Done</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>4.8⭐</Text><Text style={styles.statLabel}>Avg Rating</Text></View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesGrid}>
          {SERVICES.map((s) => (
            <View key={s.label} style={styles.serviceCard}>
              <Text style={styles.serviceIcon}>{s.icon}</Text>
              <Text style={styles.serviceLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why FixItNow?</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        {[
          { step: '1', title: 'Take a Photo', desc: 'Snap a picture of the problem', icon: '📸' },
          { step: '2', title: 'AI Diagnosis', desc: 'Our AI identifies the issue instantly', icon: '🤖' },
          { step: '3', title: 'Book Expert', desc: 'Choose from verified technicians', icon: '👨‍🔧' },
          { step: '4', title: 'Problem Solved', desc: 'Sit back and relax', icon: '✅' },
        ].map((item) => (
          <View key={item.step} style={styles.stepCard}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{item.step}</Text></View>
            <Text style={styles.stepIcon}>{item.icon}</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Ready to fix it? 🔧</Text>
        <Text style={styles.ctaDesc}>Join thousands of happy homeowners across Pakistan</Text>
        <Pressable style={styles.ctaBtn} onPress={() => router.push('/signup')}>
          <Text style={styles.ctaBtnText}>Create Free Account</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.ctaLogin}>Already have an account? <Text style={styles.ctaLoginBold}>Login</Text></Text>
        </Pressable>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  topLogo: { color: '#38BDF8', fontSize: 20, fontWeight: 'bold' },
  topBtns: { flexDirection: 'row', gap: 10 },
  loginBtn: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  loginBtnText: { color: '#38BDF8', fontWeight: '600', fontSize: 14 },
  signupBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  signupBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  heroIcon: { fontSize: 80, marginBottom: 20 },
  heroTitle: { color: '#E5E7EB', fontSize: 36, fontWeight: 'bold', textAlign: 'center', lineHeight: 44, marginBottom: 16 },
  heroSubtitle: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  heroBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  heroBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 17 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 12, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#1E293B', padding: 16, borderRadius: 16, alignItems: 'center' },
  statValue: { color: '#38BDF8', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#64748B', fontSize: 12 },
  section: { marginHorizontal: 20, marginTop: 30 },
  sectionTitle: { color: '#E5E7EB', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  servicesGrid: { flexDirection: 'row', gap: 12, paddingRight: 8 },
  serviceCard: { backgroundColor: '#1E293B', paddingVertical: 20, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', width: 100 },
  serviceIcon: { fontSize: 34, marginBottom: 10 },
  serviceLabel: { color: '#E5E7EB', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  featureCard: { flexDirection: 'row', backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginBottom: 10, alignItems: 'center' },
  featureIcon: { fontSize: 32, marginRight: 16 },
  featureContent: { flex: 1 },
  featureTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  featureDesc: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginBottom: 10 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  stepIcon: { fontSize: 28, marginRight: 12 },
  stepContent: { flex: 1 },
  stepTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  stepDesc: { color: '#64748B', fontSize: 13 },
  ctaCard: { margin: 20, backgroundColor: '#1E3A5F', borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 30 },
  ctaTitle: { color: '#E5E7EB', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  ctaDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  ctaBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginBottom: 14, width: '100%', alignItems: 'center' },
  ctaBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  ctaLogin: { color: '#64748B', fontSize: 14 },
  ctaLoginBold: { color: '#38BDF8', fontWeight: 'bold' },
});