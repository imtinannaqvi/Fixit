import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
  Keyboard, TouchableWithoutFeedback, Animated, Image
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { API_URL, BASE_URL } from '../../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_CONFIG: any = {
  Pending:     { bg: '#1c1917', text: '#f97316', icon: 'time-outline',        border: '#f9731640' },
  Confirmed:   { bg: '#052e16', text: '#4ade80', icon: 'checkmark-circle-outline', border: '#4ade8040' },
  'In Progress': { bg: '#1e3a5f', text: '#38bdf8', icon: 'construct-outline',  border: '#38bdf840' },
  Completed:   { bg: '#052e16', text: '#4ade80', icon: 'checkmark-done-outline', border: '#4ade8040' },
  Cancelled:   { bg: '#450a0a', text: '#f87171', icon: 'close-circle-outline', border: '#f8717140' },
};

// Skeleton card component
function SkeletonCard() {
  const anim = useRef(new Animated.Value(0.3)).current;
  Animated.loop(
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])
  ).start();
  return (
    <Animated.View style={[styles.skeletonCard, { opacity: anim }]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '100%', height: 8, marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { width: '80%', height: 8, marginTop: 8 }]} />
    </Animated.View>
  );
}

export default function Bookings() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchBookings(); }, [token])
  );

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (err) {
      console.log('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await axios.patch(`${API_URL}/bookings/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
          Toast.show({ type: 'success', text1: 'Booking Cancelled' });
          fetchBookings();
        } catch { Toast.show({ type: 'error', text1: 'Failed to cancel' }); }
      }},
    ]);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Booking', 'This will permanently delete the booking.', [
      { text: 'No', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`${API_URL}/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          Toast.show({ type: 'success', text1: '🗑️ Booking Deleted' });
          fetchBookings();
        } catch { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
      }},
    ]);
  };

  const handleComplete = async (id: string) => {
    Alert.alert('Complete Booking', 'Mark this booking as completed?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
        try {
          await axios.patch(`${API_URL}/bookings/${id}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
          Toast.show({ type: 'success', text1: '✅ Booking Completed!' });
          fetchBookings();
        } catch { Toast.show({ type: 'error', text1: 'Failed to complete' }); }
      }},
    ]);
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await axios.patch(`${API_URL}/bookings/${id}/pay`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Toast.show({ type: 'success', text1: '💰 Payment Confirmed!' });
      setPaymentModal(false);
      fetchBookings();
    } catch { Toast.show({ type: 'error', text1: 'Failed to update payment' }); }
  };

  const handleReviewSubmit = async () => {
    Keyboard.dismiss();
    if (!comment.trim()) { Toast.show({ type: 'error', text1: 'Please write a comment' }); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/reviews`, {
        technicianId: selectedBooking.technicianId._id,
        bookingId: selectedBooking._id,
        rating, comment,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Toast.show({ type: 'success', text1: '⭐ Review Submitted!' });
      setReviewModal(false);
      setComment(''); setRating(5);
      fetchBookings();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.msg || 'Failed to submit review' });
    } finally { setSubmitting(false); }
  };

  const topPad = insets.top > 0 ? insets.top : 44;

  const renderBooking = ({ item }: any) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
    return (
      <View style={[styles.card, { borderColor: statusConfig.border }]}>

        {/* Group badge */}
        {item.isGroupBooking && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={12} color="#4ADE80" />
            <Text style={styles.groupBadgeText}>Group · {item.societyName}</Text>
            {item.discountPercent > 0 && (
              <View style={styles.groupDiscountPill}>
                <Text style={styles.groupDiscountText}>{item.discountPercent}% off</Text>
              </View>
            )}
          </View>
        )}

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.technicianId?.name?.[0] || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.techName}>{item.technicianId?.name || 'Unknown'}</Text>
            <View style={styles.skillRow}>
              <Ionicons name="construct-outline" size={12} color="#38BDF8" />
              <Text style={styles.techSkill}>{item.technicianId?.skill || ''}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Payment banner for completed */}
        {item.status === 'Completed' && (
          <View style={[styles.paymentBanner, { backgroundColor: item.paymentStatus === 'Paid' ? '#052e16' : '#1c1917', borderColor: item.paymentStatus === 'Paid' ? '#4ADE8040' : '#f9731640', borderWidth: 1 }]}>
            <Ionicons name={item.paymentStatus === 'Paid' ? 'checkmark-circle' : 'time'} size={18} color={item.paymentStatus === 'Paid' ? '#4ADE80' : '#f97316'} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.paymentBannerTitle, { color: item.paymentStatus === 'Paid' ? '#4ADE80' : '#f97316' }]}>
                {item.paymentStatus === 'Paid' ? 'Payment Received' : 'Payment Due'}
              </Text>
              <Text style={styles.paymentBannerSub}>
                {item.paymentStatus === 'Paid'
                  ? `Paid on ${new Date(item.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
                  : 'Cash on Delivery — pay when technician arrives'}
              </Text>
            </View>
            <Text style={[styles.paymentAmount, { color: item.paymentStatus === 'Paid' ? '#4ADE80' : '#f97316' }]}>
              Rs. {item.totalAmount}
            </Text>
          </View>
        )}

        {/* Completion photo */}
        {item.status === 'Completed' && item.completionPhotoURL && (
          <View style={styles.completionPhotoCard}>
            <View style={styles.completionPhotoHeader}>
              <Ionicons name="camera" size={14} color="#4ADE80" />
              <Text style={styles.completionPhotoLabel}>Proof of Work</Text>
            </View>
            <Image source={{ uri: `${BASE_URL}${item.completionPhotoURL}` }} style={styles.completionPhoto} resizeMode="cover" />
            <Text style={styles.completionPhotoDate}>
              Completed {item.completedAt ? new Date(item.completedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsBox}>
          {[
            { icon: 'document-text-outline' as const, label: 'Issue', value: item.issue },
            { icon: 'location-outline' as const, label: 'Address', value: item.address },
            { icon: 'calendar-outline' as const, label: 'Booked', value: new Date(item.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map((d) => (
            <View key={d.label} style={styles.detailRow}>
              <Ionicons name={d.icon} size={14} color="#64748B" style={{ marginTop: 1 }} />
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{d.value}</Text>
            </View>
          ))}
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color="#4ADE80" style={{ marginTop: 1 }} />
            <Text style={styles.detailLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>Rs. {item.totalAmount}</Text>
              <View style={[styles.payStatusPill, { backgroundColor: item.paymentStatus === 'Paid' ? '#052e16' : '#1c1917' }]}>
                <Text style={[styles.payStatusText, { color: item.paymentStatus === 'Paid' ? '#4ADE80' : '#f97316' }]}>
                  {item.paymentStatus || 'Unpaid'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBtns}>
          {item.status === 'Pending' && (
            <>
              <Pressable style={styles.completeBtn} onPress={() => handleComplete(item._id)}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#4ADE80" />
                <Text style={styles.completeBtnText}>Done</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => handleCancel(item._id)}>
                <Ionicons name="close-circle-outline" size={14} color="#f87171" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </>
          )}
          {(item.status === 'Pending' || item.status === 'Confirmed' || item.status === 'In Progress') && (
            <Pressable style={styles.chatBtn} onPress={() => router.push({
              pathname: '/chat/[bookingId]',
              params: { bookingId: item._id.toString(), technicianName: item.technicianId?.name || 'Technician' }
            })}>
              <Ionicons name="chatbubble-outline" size={14} color="#38BDF8" />
              <Text style={styles.chatBtnText}>Chat</Text>
            </Pressable>
          )}
          {item.status === 'Completed' && item.paymentStatus !== 'Paid' && (
            <Pressable style={styles.payBtn} onPress={() => { setSelectedBooking(item); setPaymentModal(true); }}>
              <Ionicons name="cash-outline" size={14} color="#f97316" />
              <Text style={styles.payBtnText}>Pay</Text>
            </Pressable>
          )}
          {item.status === 'Completed' && (
            <Pressable style={styles.reviewBtn} onPress={() => { setSelectedBooking(item); setReviewModal(true); }}>
              <Ionicons name="star-outline" size={14} color="#FBBF24" />
              <Text style={styles.reviewBtnText}>Review</Text>
            </Pressable>
          )}
        </View>

        {(item.status === 'Cancelled' || item.status === 'Completed') && (
          <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
            <Ionicons name="trash-outline" size={14} color="#f87171" />
            <Text style={styles.deleteBtnText}>Delete Booking</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>My Bookings</Text>
        <Pressable style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#38BDF8" />
        </Pressable>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={['#38BDF8']} />
          }
          renderItem={renderBooking}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="clipboard-outline" size={48} color="#334155" />
              </View>
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySub}>Book a technician to get started</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push('/tabs/explore')}>
                <Ionicons name="search" size={16} color="#0F172A" />
                <Text style={styles.emptyBtnText}>Find Technicians</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Payment Modal */}
      <Modal visible={paymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="cash" size={24} color="#4ADE80" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Confirm Cash Payment</Text>
                <Text style={styles.modalSubtitle}>{selectedBooking?.technicianId?.name}</Text>
              </View>
              <Pressable onPress={() => setPaymentModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </Pressable>
            </View>
            <View style={styles.paymentSummary}>
              {[
                { label: 'Service', value: selectedBooking?.technicianId?.skill },
                { label: 'Issue', value: selectedBooking?.issue },
                { label: 'Method', value: '💵 Cash on Delivery' },
              ].map(r => (
                <View key={r.label} style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>{r.label}</Text>
                  <Text style={styles.paymentSummaryValue}>{r.value}</Text>
                </View>
              ))}
              <View style={[styles.paymentSummaryRow, styles.paymentTotalRow]}>
                <Text style={styles.paymentTotalLabel}>Total Amount</Text>
                <Text style={styles.paymentTotalValue}>Rs. {selectedBooking?.totalAmount}</Text>
              </View>
            </View>
            <Text style={styles.paymentNote}>
              By confirming, you acknowledge that cash has been paid to the technician.
            </Text>
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setPaymentModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPayBtn} onPress={() => handleMarkPaid(selectedBooking?._id)}>
                <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                <Text style={styles.modalPayText}>Confirm Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={reviewModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeaderRow}>
                    <View style={[styles.modalIconCircle, { backgroundColor: '#1c1917' }]}>
                      <Ionicons name="star" size={24} color="#FBBF24" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.modalTitle}>Rate & Review</Text>
                      <Text style={styles.modalSubtitle}>{selectedBooking?.technicianId?.name}</Text>
                    </View>
                    <Pressable onPress={() => { Keyboard.dismiss(); setReviewModal(false); }} style={styles.modalCloseBtn}>
                      <Ionicons name="close" size={18} color="#94A3B8" />
                    </Pressable>
                  </View>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => setRating(star)}>
                        <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={36} color={star <= rating ? '#FBBF24' : '#334155'} />
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.ratingLabel}>Your Comment</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Share your experience..."
                    placeholderTextColor="#64748B"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                    blurOnSubmit
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <View style={styles.modalBtns}>
                    <Pressable style={styles.modalCancelBtn} onPress={() => { Keyboard.dismiss(); setReviewModal(false); }}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.modalSubmitBtn} onPress={handleReviewSubmit} disabled={submitting}>
                      {submitting
                        ? <Text style={styles.modalSubmitText}>Submitting...</Text>
                        : <><Ionicons name="star" size={16} color="#0F172A" /><Text style={styles.modalSubmitText}> Submit</Text></>
                      }
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#E5E7EB' },
  refreshIconBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },

  // Skeleton
  skeletonCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#334155' },
  skeletonInfo: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: '#334155', borderRadius: 6, width: '80%' },

  // Card
  card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1 },
  groupBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#052e16', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  groupBadgeText: { color: '#4ADE80', fontSize: 11, fontWeight: 'bold' },
  groupDiscountPill: { backgroundColor: '#0F172A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  groupDiscountText: { color: '#4ADE80', fontSize: 10, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#0F172A', fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  techName: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  techSkill: { color: '#38BDF8', fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  paymentBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12 },
  paymentBannerTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  paymentBannerSub: { color: '#64748B', fontSize: 11 },
  paymentAmount: { fontSize: 15, fontWeight: 'bold' },
  completionPhotoCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#4ADE8030' },
  completionPhotoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  completionPhotoLabel: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  completionPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 6 },
  completionPhotoDate: { color: '#64748B', fontSize: 11 },
  detailsBox: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  detailLabel: { color: '#64748B', fontSize: 12, width: 64 },
  detailValue: { color: '#E5E7EB', fontSize: 12, flex: 1 },
  amountRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountValue: { color: '#4ADE80', fontSize: 13, fontWeight: 'bold' },
  payStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  payStatusText: { fontSize: 10, fontWeight: 'bold' },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#052e16', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4ADE8030' },
  completeBtnText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#450a0a', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f8717130' },
  cancelBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 12 },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38BDF830' },
  chatBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1c1917', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f9731630' },
  payBtnText: { color: '#f97316', fontWeight: 'bold', fontSize: 12 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1c1917', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FBBF2430' },
  reviewBtnText: { color: '#FBBF24', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, backgroundColor: '#1a0a0a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#7f1d1d' },
  deleteBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#38BDF8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#052e16', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { color: '#38BDF8', fontSize: 13, marginTop: 2 },
  modalCloseBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 10 },
  paymentSummary: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, marginBottom: 16 },
  paymentSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  paymentSummaryLabel: { color: '#64748B', fontSize: 13 },
  paymentSummaryValue: { color: '#E5E7EB', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  paymentTotalRow: { borderBottomWidth: 0, marginTop: 4 },
  paymentTotalLabel: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold' },
  paymentTotalValue: { color: '#4ADE80', fontSize: 20, fontWeight: 'bold' },
  paymentNote: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  ratingLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  commentInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 15, height: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, backgroundColor: '#334155', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#94A3B8', fontWeight: '600' },
  modalSubmitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#38BDF8', padding: 14, borderRadius: 12 },
  modalSubmitText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  modalPayBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#4ADE80', padding: 14, borderRadius: 12 },
  modalPayText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
});