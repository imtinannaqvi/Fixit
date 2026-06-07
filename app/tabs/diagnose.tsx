import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Image, ScrollView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL, BASE_URL } from '../../config';

const SEVERITY_COLORS: any = {
  Low: { bg: '#052e16', text: '#4ade80', icon: '🟢' },
  Medium: { bg: '#1c1917', text: '#f97316', icon: '🟡' },
  High: { bg: '#450a0a', text: '#f87171', icon: '🔴' },
};

const SKILL_MAP: any = {
  'Plumbing Leak': 'Plumber',
  'Electrical Issue': 'Electrician',
  'Carpentry Issue': 'Carpenter',
  'Painting Issue': 'Painter',
  'AC Issue': 'AC Technician',
  'General Issue': 'All',
};

export default function Diagnose() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [priceEstimate, setPriceEstimate] = useState<any>(null); // 👈 added
  const [loadingPrice, setLoadingPrice] = useState(false); // 👈 added

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
      setResult(null);
      setPriceEstimate(null); // 👈 reset price on new image
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled) {
      setImage(res.assets[0].uri);
      setResult(null);
      setPriceEstimate(null); // 👈 reset price on new image
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: image,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const res = await axios.post(`${BASE_URL}/detect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);

      // 👇 auto-fetch price estimate after diagnosis
      fetchPriceEstimate(res.data);

    } catch (err) {
      console.log('Error:', err);
      Alert.alert('Error', 'Failed to analyze image. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // 👇 new function — fetch AI price estimate
  const fetchPriceEstimate = async (diagnosisResult: any) => {
    setLoadingPrice(true);
    try {
      const skill = SKILL_MAP[diagnosisResult.faultType] || 'General';
      const res = await axios.post(`${BASE_URL}/api/price-estimate`, {
        faultType: diagnosisResult.faultType,
        severity: diagnosisResult.severity,
        skill,
      });
      setPriceEstimate(res.data);
    } catch (err) {
      console.log('Price estimate error:', err);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleFindTechnician = () => {
    const skill = SKILL_MAP[result?.faultType] || 'All';
    router.push({ pathname: '/tabs/explore', params: { skill } });
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={styles.title}>🤖 AI Diagnosis</Text>
      <Text style={styles.subtitle}>
        Take a photo of the issue and let AI identify the problem + estimate the cost
      </Text>

      {/* Image Container */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>📸</Text>
            <Text style={styles.placeholderText}>No image selected</Text>
            <Text style={styles.placeholderSub}>Take or upload a photo to start diagnosis</Text>
          </View>
        )}
      </View>

      {/* Pick Buttons */}
      <View style={styles.btnRow}>
        <Pressable style={styles.pickBtn} onPress={pickImage}>
          <Text style={styles.pickBtnIcon}>🖼️</Text>
          <Text style={styles.pickBtnText}>Gallery</Text>
        </Pressable>
        <Pressable style={styles.pickBtn} onPress={takePhoto}>
          <Text style={styles.pickBtnIcon}>📷</Text>
          <Text style={styles.pickBtnText}>Camera</Text>
        </Pressable>
      </View>

      {/* Analyze Button */}
      {image && !result && (
        <Pressable style={styles.analyzeBtn} onPress={analyzeImage} disabled={loading}>
          {loading ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color="#0F172A" />
              <Text style={styles.analyzeBtnText}>  Analyzing image...</Text>
            </View>
          ) : (
            <Text style={styles.analyzeBtnText}>🔍 Analyze & Estimate Cost</Text>
          )}
        </Pressable>
      )}

      {/* Result Card */}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>🔍 Diagnosis Result</Text>

          {/* Fault Type */}
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>🔧 Fault Type</Text>
            <Text style={styles.resultValue}>{result.faultType}</Text>
          </View>

          {/* Severity */}
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>⚠️ Severity</Text>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[result.severity]?.bg }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[result.severity]?.text }]}>
                {SEVERITY_COLORS[result.severity]?.icon} {result.severity}
              </Text>
            </View>
          </View>

          {/* Technician Needed */}
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>👨‍🔧 Expert Needed</Text>
            <Text style={styles.resultValue}>{SKILL_MAP[result.faultType] || 'General'}</Text>
          </View>

          {/* Description */}
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>📋 Description</Text>
            <Text style={styles.descText}>{result.description}</Text>
          </View>

          {/* Recommendation */}
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>💡 Recommendation</Text>
            <Text style={styles.descText}>{result.recommendation}</Text>
          </View>

          {/* 👇 AI Price Estimator Section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceSectionTitle}>💰 AI Price Estimate</Text>

            {loadingPrice ? (
              <View style={styles.priceLoading}>
                <ActivityIndicator color="#38BDF8" size="small" />
                <Text style={styles.priceLoadingText}>Calculating estimate...</Text>
              </View>
            ) : priceEstimate ? (
              <View>
                {/* Price Range */}
                <View style={styles.priceRangeRow}>
                  <View style={styles.priceRangeBox}>
                    <Text style={styles.priceRangeLabel}>Minimum</Text>
                    <Text style={styles.priceRangeMin}>
                      {priceEstimate.currency} {priceEstimate.minPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.priceRangeDash}>—</Text>
                  <View style={styles.priceRangeBox}>
                    <Text style={styles.priceRangeLabel}>Maximum</Text>
                    <Text style={styles.priceRangeMax}>
                      {priceEstimate.currency} {priceEstimate.maxPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Time Estimate */}
                <View style={styles.priceDetailRow}>
                  <Text style={styles.priceDetailIcon}>⏱️</Text>
                  <Text style={styles.priceDetailLabel}>Time Estimate</Text>
                  <Text style={styles.priceDetailValue}>{priceEstimate.timeEstimate}</Text>
                </View>

                {/* Breakdown */}
                <View style={styles.priceBreakdownBox}>
                  <Text style={styles.priceBreakdownLabel}>📊 Cost Breakdown</Text>
                  <Text style={styles.priceBreakdownText}>{priceEstimate.breakdown}</Text>
                </View>

                {/* Money saving tip */}
                <View style={styles.priceTipBox}>
                  <Text style={styles.priceTipIcon}>💡</Text>
                  <Text style={styles.priceTipText}>{priceEstimate.note}</Text>
                </View>

                <Text style={styles.priceDisclaimer}>
                  * Estimates are approximate. Actual cost may vary based on parts and labor.
                </Text>
              </View>
            ) : (
              <Text style={styles.priceError}>Could not generate estimate. Please try again.</Text>
            )}
          </View>

          {/* Action Buttons */}
          <Pressable style={styles.findBtn} onPress={handleFindTechnician}>
            <Text style={styles.findBtnText}>👨‍🔧 Find Technician for This Issue</Text>
          </Pressable>

          <Pressable
            style={styles.retryBtn}
            onPress={() => { setImage(null); setResult(null); setPriceEstimate(null); }}
          >
            <Text style={styles.retryBtnText}>🔄 Try Another Image</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#38BDF8', marginBottom: 8 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 20, lineHeight: 20 },

  imageContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, height: 220, borderWidth: 1, borderColor: '#334155' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', gap: 8 },
  placeholderIcon: { fontSize: 48 },
  placeholderText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
  placeholderSub: { color: '#64748B', fontSize: 12 },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pickBtn: { flex: 1, backgroundColor: '#1E293B', padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' },
  pickBtnIcon: { fontSize: 20 },
  pickBtnText: { color: '#E5E7EB', fontWeight: '600', fontSize: 15 },

  analyzeBtn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  analyzingRow: { flexDirection: 'row', alignItems: 'center' },
  analyzeBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },

  resultCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  resultTitle: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { color: '#64748B', fontSize: 14 },
  resultValue: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold' },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  severityText: { fontWeight: 'bold', fontSize: 13 },

  descBox: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, marginBottom: 12 },
  descLabel: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },

  // 👇 Price estimator styles
  priceSection: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e3a5f' },
  priceSectionTitle: { color: '#4ADE80', fontSize: 16, fontWeight: 'bold', marginBottom: 14 },
  priceLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  priceLoadingText: { color: '#64748B', fontSize: 13 },
  priceRangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  priceRangeBox: { flex: 1, alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 12 },
  priceRangeLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  priceRangeMin: { color: '#4ADE80', fontSize: 20, fontWeight: 'bold' },
  priceRangeMax: { color: '#f97316', fontSize: 20, fontWeight: 'bold' },
  priceRangeDash: { color: '#64748B', fontSize: 20, marginHorizontal: 8 },
  priceDetailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 12, borderRadius: 10, marginBottom: 10, gap: 8 },
  priceDetailIcon: { fontSize: 16 },
  priceDetailLabel: { color: '#64748B', fontSize: 13, flex: 1 },
  priceDetailValue: { color: '#E5E7EB', fontSize: 13, fontWeight: 'bold' },
  priceBreakdownBox: { backgroundColor: '#1E293B', padding: 12, borderRadius: 10, marginBottom: 10 },
  priceBreakdownLabel: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  priceBreakdownText: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  priceTipBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1c1917', padding: 12, borderRadius: 10, marginBottom: 10, gap: 8, borderWidth: 1, borderColor: '#f97316' },
  priceTipIcon: { fontSize: 16 },
  priceTipText: { color: '#f97316', fontSize: 12, lineHeight: 18, flex: 1 },
  priceDisclaimer: { color: '#475569', fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
  priceError: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  findBtn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  findBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  retryBtn: { backgroundColor: '#1E3A5F', padding: 14, borderRadius: 14, alignItems: 'center' },
  retryBtnText: { color: '#38BDF8', fontWeight: '600', fontSize: 14 },
});