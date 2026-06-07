import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Image, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, BASE_URL } from '../../config';

export default function AvailableJobs() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [token])
  );

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/jobposts/open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(res.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openBidModal = (job: any) => {
    setSelectedJob(job);
    setBidAmount('');
    setEstimatedTime('');
    setMessage('');
    setBidModal(true);
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || parseInt(bidAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid bid amount' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/jobposts/${selectedJob._id}/bid`,
        { bidAmount: parseInt(bidAmount), estimatedTime, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: '💰 Bid Submitted!',
        text2: 'You will be notified if accepted',
      });
      setBidModal(false);
      fetchJobs();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Bid Failed', text2: err?.response?.data?.msg || 'Try again' });
    } finally {
      setSubmitting(false);
    }
  };

  const hasAlreadyBid = (job: any) => {
    // check by matching technician — will be refined with tech profile
    return false;
  };

  const topPadding = insets.top > 0 ? insets.top : 44;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>🔨 Available Jobs</Text>
      <Text style={styles.subtitle}>Browse and bid on jobs near you</Text>

      {loading ? (
        <ActivityIndicator color="#38BDF8" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <View style={styles.skillBadge}>
                    <Text style={styles.skillBadgeText}>{item.skillRequired}</Text>
                  </View>
                </View>
                <View style={styles.bidsBox}>
                  <Text style={styles.bidsCount}>{item.bids?.length || 0}</Text>
                  <Text style={styles.bidsLabel}>bids</Text>
                </View>
              </View>

              {item.imageURL && (
                <Image
                  source={{ uri: `${BASE_URL}${item.imageURL}` }}
                  style={styles.jobImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.jobDesc} numberOfLines={3}>{item.description}</Text>

              <View style={styles.jobMeta}>
                <Text style={styles.jobAddress} numberOfLines={1}>📍 {item.address}</Text>
                <Text style={styles.jobDate}>
                  🕐 {new Date(item.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                </Text>
              </View>

              {/* Budget */}
              {(item.budgetMin > 0 || item.budgetMax > 0) && (
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>
                    💰 Budget: Rs. {item.budgetMin?.toLocaleString()} — Rs. {item.budgetMax?.toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Homeowner info */}
              <View style={styles.homeownerRow}>
                <Text style={styles.homeownerLabel}>Posted by</Text>
                <Text style={styles.homeownerName}>{item.homeownerId?.name || 'Homeowner'}</Text>
              </View>

              <Pressable style={styles.bidBtn} onPress={() => openBidModal(item)}>
                <Text style={styles.bidBtnText}>💰 Submit Your Bid</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No jobs available</Text>
              <Text style={styles.emptySub}>Check back soon for new job posts</Text>
            </View>
          }
        />
      )}

      {/* Bid Modal */}
      <Modal visible={bidModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>💰 Submit Bid</Text>
                  <Pressable onPress={() => setBidModal(false)} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseBtnText}>✕</Text>
                  </Pressable>
                </View>

                <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
                <Text style={styles.modalJobDesc} numberOfLines={2}>{selectedJob?.description}</Text>

                {selectedJob?.budgetMin > 0 && (
                  <View style={styles.budgetHintBox}>
                    <Text style={styles.budgetHintText}>
                      💡 Homeowner's budget: Rs. {selectedJob?.budgetMin?.toLocaleString()} — Rs. {selectedJob?.budgetMax?.toLocaleString()}
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Your Bid Amount (Rs.) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#64748B"
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                />

                {/* Quick presets */}
                <View style={styles.presetsRow}>
                  {[500, 1000, 1500, 2000, 3000].map(p => (
                    <Pressable
                      key={p}
                      style={[styles.presetBtn, bidAmount === String(p) && styles.presetBtnActive]}
                      onPress={() => setBidAmount(String(p))}
                    >
                      <Text style={[styles.presetBtnText, bidAmount === String(p) && styles.presetBtnTextActive]}>
                        {p.toLocaleString()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Estimated Time</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2-3 hours, Half day"
                  placeholderTextColor="#64748B"
                  value={estimatedTime}
                  onChangeText={setEstimatedTime}
                />

                <Text style={styles.inputLabel}>Message to Homeowner</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Explain your approach, experience with similar jobs..."
                  placeholderTextColor="#64748B"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                />

                <Pressable
                  style={styles.submitBidBtn}
                  onPress={handleSubmitBid}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <Text style={styles.submitBidBtnText}>
                      💰 Submit Bid · Rs. {parseInt(bidAmount || '0').toLocaleString()}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#38BDF8', marginBottom: 4 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardInfo: { flex: 1 },
  jobTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  skillBadge: { backgroundColor: '#1e3a5f', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  skillBadgeText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
  bidsBox: { backgroundColor: '#0F172A', padding: 10, borderRadius: 10, alignItems: 'center', minWidth: 50 },
  bidsCount: { color: '#38BDF8', fontSize: 20, fontWeight: 'bold' },
  bidsLabel: { color: '#64748B', fontSize: 10 },
  jobImage: { width: '100%', height: 140, borderRadius: 10, marginBottom: 10 },
  jobDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  jobMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobAddress: { color: '#64748B', fontSize: 12, flex: 1 },
  jobDate: { color: '#64748B', fontSize: 12 },
  budgetBadge: { backgroundColor: '#1c1917', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#f97316' },
  budgetText: { color: '#f97316', fontSize: 12, fontWeight: '600' },
  homeownerRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 },
  homeownerLabel: { color: '#64748B', fontSize: 12 },
  homeownerName: { color: '#E5E7EB', fontSize: 12, fontWeight: 'bold' },
  bidBtn: { backgroundColor: '#38BDF8', padding: 12, borderRadius: 12, alignItems: 'center' },
  bidBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 10 },
  modalCloseBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  modalJobTitle: { color: '#38BDF8', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  modalJobDesc: { color: '#64748B', fontSize: 13, marginBottom: 14 },
  budgetHintBox: { backgroundColor: '#1c1917', padding: 10, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#f97316' },
  budgetHintText: { color: '#f97316', fontSize: 12 },
  inputLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  modalInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  presetBtn: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  presetBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#38BDF8' },
  presetBtnText: { color: '#64748B', fontSize: 13 },
  presetBtnTextActive: { color: '#38BDF8', fontWeight: 'bold' },
  submitBidBtn: { backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  submitBidBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
});