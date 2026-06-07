import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, ScrollView
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, BASE_URL } from '../../config';

const STATUS_COLORS: any = {
  open: { bg: '#052e16', text: '#4ADE80' },
  assigned: { bg: '#1e3a5f', text: '#38BDF8' },
  completed: { bg: '#052e16', text: '#4ADE80' },
  cancelled: { bg: '#450a0a', text: '#f87171' },
};

export default function MyJobPosts() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobPosts, setJobPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [bidsModal, setBidsModal] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobPosts();
    }, [token])
  );

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/jobposts/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobPosts(res.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openBids = (post: any) => {
    setSelectedPost(post);
    setBidsModal(true);
  };

  const handleAcceptBid = async (bidId: string) => {
    Alert.alert('Accept Bid', 'Accept this bid and create a booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          setAccepting(true);
          try {
            await axios.patch(
              `${API_URL}/jobposts/${selectedPost._id}/accept-bid/${bidId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            Toast.show({
              type: 'success',
              text1: '🎉 Bid Accepted!',
              text2: 'Booking created — check My Bookings',
            });
            setBidsModal(false);
            fetchJobPosts();
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed to accept bid', text2: err?.response?.data?.msg });
          } finally {
            setAccepting(false);
          }
        }
      }
    ]);
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Job', 'Cancel this job post?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await axios.patch(`${API_URL}/jobposts/${id}/cancel`, {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
            Toast.show({ type: 'success', text1: 'Job post cancelled' });
            fetchJobPosts();
          } catch (err) {
            Toast.show({ type: 'error', text1: 'Failed to cancel' });
          }
        }
      }
    ]);
  };

  const topPadding = insets.top > 0 ? insets.top : 44;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔨 My Job Posts</Text>
          <Text style={styles.subtitle}>Track bids from technicians</Text>
        </View>
        <Pressable style={styles.newPostBtn} onPress={() => router.push('/tabs/job-post' as any)}>
          <Text style={styles.newPostBtnText}>+ New Job</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#38BDF8" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobPosts}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.jobSkill}>{item.skillRequired}</Text>
                  <Text style={styles.jobAddress} numberOfLines={1}>📍 {item.address}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status]?.bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status]?.text }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Job image */}
              {item.imageURL && (
                <Image
                  source={{ uri: `${BASE_URL}${item.imageURL}` }}
                  style={styles.jobImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>

              {/* Budget */}
              {(item.budgetMin > 0 || item.budgetMax > 0) && (
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>
                    💰 Budget: Rs. {item.budgetMin} — Rs. {item.budgetMax}
                  </Text>
                </View>
              )}

              {/* Bids count */}
              <View style={styles.bidsRow}>
                <View style={styles.bidsCountBox}>
                  <Text style={styles.bidsCount}>{item.bids?.length || 0}</Text>
                  <Text style={styles.bidsLabel}>Bids Received</Text>
                </View>
                {item.bids?.length > 0 && item.status === 'open' && (
                  <View style={styles.lowestBidBox}>
                    <Text style={styles.lowestBidLabel}>Lowest Bid</Text>
                    <Text style={styles.lowestBidValue}>
                      Rs. {Math.min(...item.bids.map((b: any) => b.bidAmount)).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {item.status === 'open' && (
                  <>
                    <Pressable
                      style={styles.viewBidsBtn}
                      onPress={() => openBids(item)}
                    >
                      <Text style={styles.viewBidsBtnText}>
                        👁️ View Bids ({item.bids?.length || 0})
                      </Text>
                    </Pressable>
                    <Pressable style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
                      <Text style={styles.cancelBtnText}>✕</Text>
                    </Pressable>
                  </>
                )}
                {item.status === 'assigned' && (
                  <Pressable style={styles.viewBookingBtn} onPress={() => router.push('/tabs/bookings' as any)}>
                    <Text style={styles.viewBookingBtnText}>📋 View Booking</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.postedDate}>
                Posted {new Date(item.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔨</Text>
              <Text style={styles.emptyText}>No job posts yet</Text>
              <Text style={styles.emptySub}>Post a job and get bids from technicians</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/tabs/job-post' as any)}>
                <Text style={styles.emptyBtnText}>+ Post Your First Job</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Bids Modal */}
      <Modal visible={bidsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Bids Received</Text>
              <Pressable onPress={() => setBidsModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>{selectedPost?.title}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPost?.bids?.length === 0 ? (
                <View style={styles.noBidsContainer}>
                  <Text style={styles.noBidsIcon}>⏳</Text>
                  <Text style={styles.noBidsText}>No bids yet</Text>
                  <Text style={styles.noBidsSub}>Technicians will submit bids soon</Text>
                </View>
              ) : (
                selectedPost?.bids?.map((bid: any) => (
                  <View key={bid._id} style={[
                    styles.bidCard,
                    bid.status === 'accepted' && styles.bidCardAccepted,
                    bid.status === 'rejected' && styles.bidCardRejected,
                  ]}>
                    <View style={styles.bidHeader}>
                      <View style={styles.bidAvatar}>
                        <Text style={styles.bidAvatarText}>{bid.technicianName?.[0] || '?'}</Text>
                      </View>
                      <View style={styles.bidInfo}>
                        <Text style={styles.bidName}>{bid.technicianName}</Text>
                        <Text style={styles.bidSkill}>{bid.technicianSkill}</Text>
                        <View style={styles.bidMeta}>
                          <Text style={styles.bidRating}>⭐ {bid.technicianRating}</Text>
                          <Text style={styles.bidJobs}>✅ {bid.technicianJobsDone} jobs</Text>
                        </View>
                      </View>
                      <View style={styles.bidAmountBox}>
                        <Text style={styles.bidAmount}>Rs. {bid.bidAmount?.toLocaleString()}</Text>
                        {bid.estimatedTime && (
                          <Text style={styles.bidTime}>⏱️ {bid.estimatedTime}</Text>
                        )}
                      </View>
                    </View>

                    {bid.message && (
                      <View style={styles.bidMessage}>
                        <Text style={styles.bidMessageText}>{bid.message}</Text>
                      </View>
                    )}

                    {bid.status === 'accepted' && (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedBadgeText}>✅ Bid Accepted</Text>
                      </View>
                    )}
                    {bid.status === 'rejected' && (
                      <View style={styles.rejectedBadge}>
                        <Text style={styles.rejectedBadgeText}>❌ Not Selected</Text>
                      </View>
                    )}

                    {bid.status === 'pending' && selectedPost?.status === 'open' && (
                      <Pressable
                        style={styles.acceptBidBtn}
                        onPress={() => handleAcceptBid(bid._id)}
                        disabled={accepting}
                      >
                        {accepting ? (
                          <ActivityIndicator color="#0F172A" />
                        ) : (
                          <Text style={styles.acceptBidBtnText}>✅ Accept This Bid</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#38BDF8' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  newPostBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newPostBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  cardInfo: { flex: 1 },
  jobTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  jobSkill: { color: '#38BDF8', fontSize: 13, fontWeight: '600', marginBottom: 3 },
  jobAddress: { color: '#64748B', fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  jobImage: { width: '100%', height: 140, borderRadius: 10, marginBottom: 10 },
  jobDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  budgetBadge: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  budgetText: { color: '#f97316', fontSize: 12, fontWeight: '600' },
  bidsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bidsCountBox: { backgroundColor: '#0F172A', padding: 12, borderRadius: 12, alignItems: 'center', flex: 1 },
  bidsCount: { color: '#38BDF8', fontSize: 24, fontWeight: 'bold' },
  bidsLabel: { color: '#64748B', fontSize: 11, marginTop: 2 },
  lowestBidBox: { backgroundColor: '#052e16', padding: 12, borderRadius: 12, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: '#4ADE80' },
  lowestBidLabel: { color: '#64748B', fontSize: 11, marginBottom: 2 },
  lowestBidValue: { color: '#4ADE80', fontSize: 18, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8 },
  viewBidsBtn: { flex: 1, backgroundColor: '#1e3a5f', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#38BDF8' },
  viewBidsBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: { backgroundColor: '#450a0a', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#7f1d1d' },
  cancelBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 16 },
  viewBookingBtn: { flex: 1, backgroundColor: '#052e16', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#4ADE80' },
  viewBookingBtnText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 13 },
  postedDate: { color: '#475569', fontSize: 11, marginTop: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 10 },
  modalCloseBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  modalSubtitle: { color: '#64748B', fontSize: 13, marginBottom: 16 },
  noBidsContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  noBidsIcon: { fontSize: 40 },
  noBidsText: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold' },
  noBidsSub: { color: '#64748B', fontSize: 13 },
  bidCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  bidCardAccepted: { borderColor: '#4ADE80' },
  bidCardRejected: { opacity: 0.5 },
  bidHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bidAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bidAvatarText: { color: '#0F172A', fontWeight: 'bold', fontSize: 18 },
  bidInfo: { flex: 1 },
  bidName: { color: '#E5E7EB', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  bidSkill: { color: '#38BDF8', fontSize: 12, marginBottom: 4 },
  bidMeta: { flexDirection: 'row', gap: 10 },
  bidRating: { color: '#64748B', fontSize: 11 },
  bidJobs: { color: '#64748B', fontSize: 11 },
  bidAmountBox: { alignItems: 'flex-end' },
  bidAmount: { color: '#4ADE80', fontSize: 18, fontWeight: 'bold' },
  bidTime: { color: '#64748B', fontSize: 11, marginTop: 2 },
  bidMessage: { backgroundColor: '#1E293B', padding: 10, borderRadius: 10, marginBottom: 10 },
  bidMessageText: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  acceptedBadge: { backgroundColor: '#052e16', padding: 8, borderRadius: 8, alignItems: 'center' },
  acceptedBadgeText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 13 },
  rejectedBadge: { backgroundColor: '#1a0a0a', padding: 8, borderRadius: 8, alignItems: 'center' },
  rejectedBadgeText: { color: '#f87171', fontSize: 12 },
  acceptBidBtn: { backgroundColor: '#38BDF8', padding: 12, borderRadius: 12, alignItems: 'center' },
  acceptBidBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
});