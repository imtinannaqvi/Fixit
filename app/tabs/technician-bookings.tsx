import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Linking, Image, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl, Animated
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, BASE_URL } from '../../config';

const STATUS_CONFIG: any = {
  Pending:       { bg: '#1c1917', text: '#f97316', icon: 'time-outline',             border: '#f9731640' },
  Confirmed:     { bg: '#052e16', text: '#4ade80', icon: 'checkmark-circle-outline', border: '#4ade8040' },
  'In Progress': { bg: '#1e3a5f', text: '#38bdf8', icon: 'construct-outline',        border: '#38bdf840' },
  Completed:     { bg: '#052e16', text: '#4ade80', icon: 'checkmark-done-outline',   border: '#4ade8040' },
  Cancelled:     { bg: '#450a0a', text: '#f87171', icon: 'close-circle-outline',     border: '#f8717140' },
};

const SEVERITY_CONFIG: any = {
  Low:    { bg: '#052e16', text: '#4ade80', icon: 'checkmark-circle-outline' as const },
  Medium: { bg: '#1c1917', text: '#f97316', icon: 'warning-outline' as const },
  High:   { bg: '#450a0a', text: '#f87171', icon: 'alert-circle-outline' as const },
};

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
          <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '100%', height: 8, marginTop: 16 }]} />
      <View style={[styles.skeletonLine, { width: '75%', height: 8, marginTop: 8 }]} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <View style={[styles.skeletonLine, { flex: 1, height: 36, borderRadius: 10 }]} />
        <View style={[styles.skeletonLine, { flex: 1, height: 36, borderRadius: 10 }]} />
      </View>
    </Animated.View>
  );
}

export default function TechnicianBookings() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const [priceModal, setPriceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [priceTab, setPriceTab] = useState<'ai' | 'custom'>('ai');
  const [customPrice, setCustomPrice] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [aiEstimate, setAiEstimate] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [settingPrice, setSettingPrice] = useState(false);

  const [completionModal, setCompletionModal] = useState(false);
  const [completionBooking, setCompletionBooking] = useState<any>(null);
  const [completionPhoto, setCompletionPhoto] = useState<any>(null);
  const [uploadingCompletion, setUploadingCompletion] = useState(false);

  useFocusEffect(useCallback(() => { fetchBookings(); }, [token]));

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/bookings/technician`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (err) { console.log('Error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const handleStatusUpdate = async (id: string, status: string) => {
    Alert.alert('Update Status', `Mark as "${status}"?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
        try {
          await axios.patch(`${API_URL}/bookings/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
          Toast.show({ type: 'success', text1: `Status updated to ${status}` });
          fetchBookings();
        } catch { Toast.show({ type: 'error', text1: 'Failed to update status' }); }
      }},
    ]);
  };

  const handleCall = (phone: string, name: string) => {
    if (!phone) { Toast.show({ type: 'error', text1: 'No phone number', text2: `${name} has not added a phone number` }); return; }
    Alert.alert(`Call ${name}`, phone, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    if (!phone) { Toast.show({ type: 'error', text1: 'No phone number' }); return; }
    const cleaned = phone.replace(/[^0-9]/g, '');
    const intl = cleaned.startsWith('0') ? '92' + cleaned.slice(1) : cleaned;
    Linking.openURL(`https://wa.me/${intl}`);
  };

  const openPriceModal = async (booking: any) => {
    setSelectedBooking(booking);
    setCustomPrice(booking.totalAmount ? String(booking.totalAmount) : '');
    setCustomNote('');
    setAiEstimate(null);
    setPriceTab('ai');
    setPriceModal(true);
    fetchAiEstimate(booking);
  };

  const fetchAiEstimate = async (booking: any) => {
    setLoadingAi(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/price-estimate`, {
        faultType: booking.smartLead?.faultType || 'General Issue',
        severity: booking.smartLead?.severity || 'Medium',
        skill: booking.technicianId?.skill || 'General',
      });
      setAiEstimate(res.data);
    } catch { } finally { setLoadingAi(false); }
  };

  const handleSetPrice = async (useAi: boolean) => {
    let finalPrice = 0;
    let priceSetBy = 'technician';
    let priceNote = customNote || null;
    if (useAi && aiEstimate) {
      finalPrice = Math.round((aiEstimate.minPrice + aiEstimate.maxPrice) / 2);
      priceSetBy = 'ai';
      priceNote = `AI Estimate: Rs. ${aiEstimate.minPrice.toLocaleString()} - Rs. ${aiEstimate.maxPrice.toLocaleString()}`;
    } else {
      finalPrice = parseInt(customPrice);
      if (!finalPrice || finalPrice <= 0) { Toast.show({ type: 'error', text1: 'Please enter a valid price' }); return; }
    }
    setSettingPrice(true);
    try {
      await axios.patch(`${API_URL}/bookings/${selectedBooking._id}/set-price`, {
        totalAmount: finalPrice, priceSetBy, priceNote,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Toast.show({ type: 'success', text1: '💰 Price Set!', text2: `Rs. ${finalPrice.toLocaleString()}` });
      setPriceModal(false);
      fetchBookings();
    } catch { Toast.show({ type: 'error', text1: 'Failed to set price' }); }
    finally { setSettingPrice(false); }
  };

  const openCompletionModal = (booking: any) => {
    setCompletionBooking(booking);
    setCompletionPhoto(null);
    setCompletionModal(true);
  };

  const pickCompletionPhoto = async (source: 'camera' | 'gallery') => {
    let result;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission required', 'Camera access needed');
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission required', 'Gallery access needed');
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    }
    if (!result.canceled && result.assets[0]) setCompletionPhoto(result.assets[0]);
  };

  const handleCompleteJob = async (withPhoto: boolean) => {
    if (withPhoto && !completionPhoto) {
      Alert.alert('Add Photo', 'Take or upload a photo', [
        { text: '📷 Camera', onPress: () => pickCompletionPhoto('camera') },
        { text: '🖼️ Gallery', onPress: () => pickCompletionPhoto('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setUploadingCompletion(true);
    try {
      const formData = new FormData();
      if (completionPhoto) {
        formData.append('completionPhoto', { uri: completionPhoto.uri, type: completionPhoto.mimeType || 'image/jpeg', name: 'completion.jpg' } as any);
      }
      await axios.patch(`${API_URL}/bookings/${completionBooking._id}/complete-with-photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      Toast.show({ type: 'success', text1: '🏠 Job Completed!', text2: completionPhoto ? 'Photo uploaded' : 'Marked complete' });
      setCompletionModal(false);
      fetchBookings();
    } catch { Toast.show({ type: 'error', text1: 'Failed to complete job' }); }
    finally { setUploadingCompletion(false); }
  };

  const getPriceLabel = (booking: any) => {
    if (booking.priceSetBy === 'ai') return 'AI';
    if (booking.priceSetBy === 'technician') return 'Custom';
    return 'Default';
  };

  const topPadding = insets.top > 0 ? insets.top : 44;

  const renderBooking = ({ item }: any) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
    const hasSmartLead = item.smartLead?.faultType;
    const isExpanded = expandedLead === item._id;
    const sev = SEVERITY_CONFIG[item.smartLead?.severity] || SEVERITY_CONFIG.Low;

    return (
      <View style={[styles.card, { borderColor: statusConfig.border }]}>

        {/* Group badge */}
        {item.isGroupBooking && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={12} color="#4ADE80" />
            <Text style={styles.groupBadgeText}>Group Job · {item.totalUnits} units</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.homeownerId?.name?.[0] || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.customerName}>{item.homeownerId?.name || 'Unknown'}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={11} color="#64748B" />
              <Text style={styles.customerEmail} numberOfLines={1}>{item.homeownerId?.email || 'No email'}</Text>
            </View>
            {item.homeownerId?.phone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={11} color="#38BDF8" />
                <Text style={styles.customerPhone}>{item.homeownerId.phone}</Text>
              </View>
            ) : (
              <Text style={styles.noPhone}>No phone added</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
            <Ionicons name={statusConfig.icon} size={11} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Smart Lead Banner */}
        {hasSmartLead && (
          <Pressable style={styles.smartLeadBanner} onPress={() => setExpandedLead(isExpanded ? null : item._id)}>
            <View style={styles.smartLeadBannerLeft}>
              <View style={styles.smartLeadIconBox}>
                <Ionicons name="hardware-chip-outline" size={16} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.smartLeadBannerTitle}>AI Smart Lead</Text>
                <View style={styles.smartLeadBannerSub}>
                  <Ionicons name={sev.icon} size={11} color={sev.text} />
                  <Text style={[styles.smartLeadBannerSubText, { color: sev.text }]}>
                    {item.smartLead.faultType} · {item.smartLead.severity}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#38BDF8" />
          </Pressable>
        )}

        {/* Smart Lead Expanded */}
        {hasSmartLead && isExpanded && (
          <View style={styles.smartLeadCard}>
            {item.faultImageURL && (
              <Image source={{ uri: `${BASE_URL}${item.faultImageURL}` }} style={styles.faultImage} resizeMode="cover" />
            )}
            <View style={[styles.severityRow, { backgroundColor: sev.bg }]}>
              <Ionicons name={sev.icon} size={16} color={sev.text} />
              <Text style={[styles.severityText, { color: sev.text }]}>
                {item.smartLead.faultType} — {item.smartLead.severity} Severity
              </Text>
            </View>
            <Text style={styles.smartLeadDesc}>{item.smartLead.description}</Text>

            {item.smartLead.recommendation && (
              <View style={styles.recommendationBox}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="bulb-outline" size={14} color="#FBBF24" />
                  <Text style={styles.recommendationTitle}>Recommendation</Text>
                </View>
                <Text style={styles.recommendationText}>{item.smartLead.recommendation}</Text>
              </View>
            )}

            {item.smartLead.toolsNeeded?.length > 0 && (
              <View style={styles.toolsBox}>
                <View style={styles.toolsHeader}>
                  <Ionicons name="construct-outline" size={14} color="#38BDF8" />
                  <Text style={styles.toolsTitle}>Tools & Parts</Text>
                </View>
                {item.smartLead.toolsNeeded.map((tool: string, i: number) => (
                  <View key={i} style={styles.toolItem}>
                    <Ionicons name="chevron-forward" size={12} color="#38BDF8" />
                    <Text style={styles.toolText}>{tool}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.smartLead.estimatedCost && (
              <View style={styles.estimatedCostRow}>
                <Ionicons name="cash-outline" size={14} color="#4ADE80" />
                <Text style={styles.estimatedCostLabel}>AI Estimated Cost</Text>
                <Text style={styles.estimatedCostValue}>{item.smartLead.estimatedCost}</Text>
              </View>
            )}
          </View>
        )}

        {/* Completion Photo */}
        {item.status === 'Completed' && item.completionPhotoURL && (
          <View style={styles.completionPhotoCard}>
            <View style={styles.completionPhotoHeader}>
              <Ionicons name="camera" size={13} color="#4ADE80" />
              <Text style={styles.completionPhotoLabel}>Work Completion Photo</Text>
            </View>
            <Image source={{ uri: `${BASE_URL}${item.completionPhotoURL}` }} style={styles.completionPhoto} resizeMode="cover" />
            <Text style={styles.completionPhotoDate}>
              Completed {item.completedAt
                ? new Date(item.completedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </Text>
          </View>
        )}

        {/* Contact Row */}
        <View style={styles.contactRow}>
          <Pressable style={styles.contactBtn} onPress={() => handleCall(item.homeownerId?.phone, item.homeownerId?.name)}>
            <Ionicons name="call-outline" size={14} color="#4ADE80" />
            <Text style={styles.contactBtnText}>Call</Text>
          </Pressable>
          <Pressable style={[styles.contactBtn, styles.contactBtnWA]} onPress={() => handleWhatsApp(item.homeownerId?.phone, item.homeownerId?.name)}>
            <Ionicons name="logo-whatsapp" size={14} color="#4ADE80" />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </Pressable>
        </View>

        {/* Details Box */}
        <View style={styles.detailsBox}>
          {[
            { icon: 'document-text-outline' as const, label: 'Issue',   value: item.issue },
            { icon: 'location-outline' as const,      label: 'Address', value: item.address },
            { icon: 'calendar-outline' as const,      label: 'Booked',  value: new Date(item.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map(d => (
            <View key={d.label} style={styles.detailRow}>
              <Ionicons name={d.icon} size={13} color="#64748B" style={{ marginTop: 1 }} />
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{d.value}</Text>
            </View>
          ))}
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={13} color="#4ADE80" style={{ marginTop: 1 }} />
            <Text style={styles.detailLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>Rs. {item.totalAmount?.toLocaleString()}</Text>
              {item.priceSetBy && item.priceSetBy !== 'default' && (
                <View style={[styles.priceSourceBadge, { backgroundColor: item.priceSetBy === 'ai' ? '#1e3a5f' : '#052e16' }]}>
                  <Ionicons name={item.priceSetBy === 'ai' ? 'hardware-chip-outline' : 'person-outline'} size={9} color={item.priceSetBy === 'ai' ? '#38BDF8' : '#4ADE80'} />
                  <Text style={[styles.priceSourceText, { color: item.priceSetBy === 'ai' ? '#38BDF8' : '#4ADE80' }]}>
                    {getPriceLabel(item)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBtns}>
          {item.status === 'Pending' && (
            <View style={styles.actionRow}>
              <Pressable style={styles.confirmBtn} onPress={() => handleStatusUpdate(item._id, 'Confirmed')}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#4ADE80" />
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => handleStatusUpdate(item._id, 'Cancelled')}>
                <Ionicons name="close-circle-outline" size={14} color="#f87171" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}

          {item.status === 'Confirmed' && (
            <Pressable style={styles.startBtn} onPress={() => handleStatusUpdate(item._id, 'In Progress')}>
              <Ionicons name="construct-outline" size={14} color="#38BDF8" />
              <Text style={styles.startBtnText}>Start Work</Text>
            </Pressable>
          )}

          {item.status === 'In Progress' && (
            <Pressable style={styles.completeBtn} onPress={() => openCompletionModal(item)}>
              <Ionicons name="camera-outline" size={14} color="#4ADE80" />
              <Text style={styles.completeBtnText}>Complete & Upload Photo</Text>
            </Pressable>
          )}

          {(item.status === 'Pending' || item.status === 'Confirmed' || item.status === 'In Progress') && (
            <View style={styles.actionRow}>
              <Pressable style={styles.priceBtn} onPress={() => openPriceModal(item)}>
                <Ionicons name="cash-outline" size={14} color="#f97316" />
                <Text style={styles.priceBtnText}>Set Price</Text>
              </Pressable>
              <Pressable style={styles.chatBtn} onPress={() => router.push({
                pathname: '/chat/[bookingId]',
                params: { bookingId: item._id.toString(), technicianName: item.homeownerId?.name || 'Customer' }
              })}>
                <Ionicons name="chatbubble-outline" size={14} color="#38BDF8" />
                <Text style={styles.chatBtnText}>Chat</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>My Jobs</Text>
          <Text style={styles.subtitle}>Bookings assigned to you</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#38BDF8" />
        </Pressable>
      </View>

      {/* Stats strip */}
      {!loading && bookings.length > 0 && (
        <View style={styles.statsStrip}>
          {[
            { label: 'Total',       value: bookings.length,                                           color: '#E5E7EB' },
            { label: 'Pending',     value: bookings.filter(b => b.status === 'Pending').length,       color: '#f97316' },
            { label: 'In Progress', value: bookings.filter(b => b.status === 'In Progress').length,   color: '#38BDF8' },
            { label: 'Completed',   value: bookings.filter(b => b.status === 'Completed').length,     color: '#4ADE80' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={['#38BDF8']} />
          }
          renderItem={renderBooking}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="briefcase-outline" size={48} color="#334155" />
              </View>
              <Text style={styles.emptyText}>No jobs yet</Text>
              <Text style={styles.emptySub}>Bookings from customers will appear here</Text>
            </View>
          }
        />
      )}

      {/* Price Modal */}
      <Modal visible={priceModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="cash" size={22} color="#f97316" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalTitle}>Set Booking Price</Text>
                    <Text style={styles.modalSubtitle} numberOfLines={1}>{selectedBooking?.issue} · {selectedBooking?.homeownerId?.name}</Text>
                  </View>
                  <Pressable onPress={() => setPriceModal(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* Tab Toggle */}
                <View style={styles.tabRow}>
                  <Pressable style={[styles.tab, priceTab === 'ai' && styles.tabActive]} onPress={() => setPriceTab('ai')}>
                    <Ionicons name="hardware-chip-outline" size={14} color={priceTab === 'ai' ? '#0F172A' : '#64748B'} />
                    <Text style={[styles.tabText, priceTab === 'ai' && styles.tabTextActive]}>AI Estimate</Text>
                  </Pressable>
                  <Pressable style={[styles.tab, priceTab === 'custom' && styles.tabActive]} onPress={() => setPriceTab('custom')}>
                    <Ionicons name="create-outline" size={14} color={priceTab === 'custom' ? '#0F172A' : '#64748B'} />
                    <Text style={[styles.tabText, priceTab === 'custom' && styles.tabTextActive]}>Custom Price</Text>
                  </Pressable>
                </View>

                {priceTab === 'ai' && (
                  loadingAi ? (
                    <View style={styles.aiLoading}>
                      <Ionicons name="hardware-chip-outline" size={32} color="#38BDF8" />
                      <Text style={styles.aiLoadingText}>Getting AI estimate...</Text>
                    </View>
                  ) : aiEstimate ? (
                    <View style={styles.aiContent}>
                      <View style={styles.aiPriceRow}>
                        <View style={styles.aiPriceBox}>
                          <Text style={styles.aiPriceLabel}>Min</Text>
                          <Text style={styles.aiPriceMin}>Rs. {aiEstimate.minPrice.toLocaleString()}</Text>
                        </View>
                        <Ionicons name="remove-outline" size={20} color="#64748B" />
                        <View style={styles.aiPriceBox}>
                          <Text style={styles.aiPriceLabel}>Max</Text>
                          <Text style={styles.aiPriceMax}>Rs. {aiEstimate.maxPrice.toLocaleString()}</Text>
                        </View>
                      </View>
                      <View style={styles.aiSuggestedBox}>
                        <Text style={styles.aiSuggestedLabel}>Suggested Price</Text>
                        <Text style={styles.aiSuggestedValue}>
                          Rs. {Math.round((aiEstimate.minPrice + aiEstimate.maxPrice) / 2).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.aiDetailRow}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.aiDetailLabel}>Est. Time</Text>
                        <Text style={styles.aiDetailValue}>{aiEstimate.timeEstimate}</Text>
                      </View>
                      <View style={styles.aiBreakdownBox}>
                        <Text style={styles.aiBreakdownText}>{aiEstimate.breakdown}</Text>
                      </View>
                      <View style={styles.aiTipBox}>
                        <Ionicons name="bulb-outline" size={14} color="#f97316" />
                        <Text style={styles.aiTipText}>{aiEstimate.note}</Text>
                      </View>
                      <Pressable style={styles.useAiBtn} onPress={() => handleSetPrice(true)} disabled={settingPrice}>
                        {settingPrice
                          ? <Ionicons name="refresh" size={18} color="#0F172A" />
                          : <>
                              <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                              <Text style={styles.useAiBtnText}>
                                Use AI Price · Rs. {Math.round((aiEstimate.minPrice + aiEstimate.maxPrice) / 2).toLocaleString()}
                              </Text>
                            </>
                        }
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.aiLoading}>
                      <Text style={styles.aiLoadingText}>Could not load AI estimate</Text>
                    </View>
                  )
                )}

                {priceTab === 'custom' && (
                  <View style={styles.customContent}>
                    <Text style={styles.inputLabel}>Your Price (Rs.)</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="e.g. 2500"
                      placeholderTextColor="#64748B"
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      keyboardType="numeric"
                    />
                    <Text style={styles.presetsLabel}>Quick Select</Text>
                    <View style={styles.presetsRow}>
                      {[500, 1000, 1500, 2000, 3000, 5000].map(p => (
                        <Pressable
                          key={p}
                          style={[styles.presetBtn, customPrice === String(p) && styles.presetBtnActive]}
                          onPress={() => setCustomPrice(String(p))}
                        >
                          <Text style={[styles.presetBtnText, customPrice === String(p) && styles.presetBtnTextActive]}>
                            {p.toLocaleString()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Note (optional)</Text>
                    <TextInput
                      style={[styles.priceInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="e.g. Includes parts and labor"
                      placeholderTextColor="#64748B"
                      value={customNote}
                      onChangeText={setCustomNote}
                      multiline
                    />
                    <Pressable
                      style={[styles.useAiBtn, { backgroundColor: '#052e16' }]}
                      onPress={() => handleSetPrice(false)}
                      disabled={settingPrice || !customPrice}
                    >
                      {settingPrice
                        ? <Ionicons name="refresh" size={18} color="#4ADE80" />
                        : <>
                            <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                            <Text style={[styles.useAiBtnText, { color: '#4ADE80' }]}>
                              Set Price · Rs. {parseInt(customPrice || '0').toLocaleString()}
                            </Text>
                          </>
                      }
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Completion Modal */}
      <Modal visible={completionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#052e16' }]}>
                <Ionicons name="camera" size={22} color="#4ADE80" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Complete Job</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {completionBooking?.issue} · {completionBooking?.homeownerId?.name}
                </Text>
              </View>
              <Pressable onPress={() => setCompletionModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            {completionPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: completionPhoto.uri }} style={styles.photoPreview} resizeMode="cover" />
                <Pressable style={styles.changePhotoBtn} onPress={() => setCompletionPhoto(null)}>
                  <Ionicons name="refresh-outline" size={14} color="#94A3B8" />
                  <Text style={styles.changePhotoBtnText}>Change Photo</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoPickerBox}>
                <View style={styles.photoPickerIconCircle}>
                  <Ionicons name="camera-outline" size={36} color="#334155" />
                </View>
                <Text style={styles.photoPickerTitle}>Add Proof of Work</Text>
                <Text style={styles.photoPickerDesc}>Upload a photo showing the completed repair. Builds trust with the homeowner.</Text>
                <View style={styles.photoPickerBtns}>
                  <Pressable style={styles.photoPickerBtn} onPress={() => pickCompletionPhoto('camera')}>
                    <Ionicons name="camera-outline" size={16} color="#38BDF8" />
                    <Text style={styles.photoPickerBtnText}>Camera</Text>
                  </Pressable>
                  <Pressable style={styles.photoPickerBtn} onPress={() => pickCompletionPhoto('gallery')}>
                    <Ionicons name="images-outline" size={16} color="#38BDF8" />
                    <Text style={styles.photoPickerBtnText}>Gallery</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.completionBtns}>
              <Pressable
                style={[styles.completeWithPhotoBtn, !completionPhoto && { opacity: 0.4 }]}
                onPress={() => handleCompleteJob(true)}
                disabled={uploadingCompletion || !completionPhoto}
              >
                {uploadingCompletion
                  ? <Ionicons name="refresh" size={18} color="#0F172A" />
                  : <>
                      <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                      <Text style={styles.completeWithPhotoBtnText}>Complete with Photo</Text>
                    </>
                }
              </Pressable>
              <Pressable
                style={styles.completeWithoutPhotoBtn}
                onPress={() => Alert.alert('Skip photo?', 'Adding a photo builds trust.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Skip & Complete', onPress: () => handleCompleteJob(false) },
                ])}
                disabled={uploadingCompletion}
              >
                <Text style={styles.completeWithoutPhotoBtnText}>Skip Photo & Complete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#E5E7EB' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  refreshBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },

  statsStrip: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1E293B', borderRadius: 14, padding: 12, gap: 4 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 10, marginTop: 2 },

  skeletonCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12 },
  skeletonHeader: { flexDirection: 'row', gap: 12 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155' },
  skeletonInfo: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: '#334155', borderRadius: 6, width: '80%' },

  card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1 },

  groupBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#052e16', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  groupBadgeText: { color: '#4ADE80', fontSize: 11, fontWeight: 'bold' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' },
  cardInfo: { flex: 1, gap: 3 },
  customerName: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerEmail: { color: '#64748B', fontSize: 11 },
  customerPhone: { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
  noPhone: { color: '#475569', fontSize: 10, fontStyle: 'italic' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  smartLeadBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#38BDF830' },
  smartLeadBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  smartLeadIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' },
  smartLeadBannerTitle: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
  smartLeadBannerSub: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  smartLeadBannerSubText: { fontSize: 11, fontWeight: '600' },

  smartLeadCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  faultImage: { width: '100%', height: 140, borderRadius: 10 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  severityText: { fontWeight: 'bold', fontSize: 13 },
  smartLeadDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  recommendationBox: { backgroundColor: '#1c1917', padding: 12, borderRadius: 10, gap: 6 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recommendationTitle: { color: '#FBBF24', fontWeight: 'bold', fontSize: 12 },
  recommendationText: { color: '#E5E7EB', fontSize: 12, lineHeight: 18 },
  toolsBox: { backgroundColor: '#1E293B', padding: 12, borderRadius: 10, gap: 6 },
  toolsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  toolsTitle: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },
  toolItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolText: { color: '#E5E7EB', fontSize: 12, flex: 1 },
  estimatedCostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#052e16', padding: 10, borderRadius: 10 },
  estimatedCostLabel: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12, flex: 1 },
  estimatedCostValue: { color: '#4ADE80', fontWeight: 'bold', fontSize: 13 },

  completionPhotoCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#4ADE8030' },
  completionPhotoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  completionPhotoLabel: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  completionPhoto: { width: '100%', height: 160, borderRadius: 10, marginBottom: 6 },
  completionPhotoDate: { color: '#64748B', fontSize: 11 },

  contactRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#052e16', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#4ADE8030' },
  contactBtnWA: { backgroundColor: '#052e16' },
  contactBtnText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },

  detailsBox: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  detailLabel: { color: '#64748B', fontSize: 12, width: 60 },
  detailValue: { color: '#E5E7EB', fontSize: 12, flex: 1 },
  amountRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountValue: { color: '#4ADE80', fontSize: 13, fontWeight: 'bold' },
  priceSourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priceSourceText: { fontSize: 9, fontWeight: 'bold' },

  actionBtns: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#052e16', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4ADE8030' },
  confirmBtnText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#450a0a', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f8717130' },
  rejectBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 12 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38BDF830' },
  startBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#052e16', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4ADE8030' },
  completeBtnText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  priceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#1c1917', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f9731630' },
  priceBtnText: { color: '#f97316', fontWeight: 'bold', fontSize: 12 },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#1e3a5f', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38BDF830' },
  chatBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },

  emptyContainer: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1c1917', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  modalCloseBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 10 },

  tabRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#38BDF8' },
  tabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#0F172A', fontWeight: 'bold' },

  aiLoading: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  aiLoadingText: { color: '#64748B', fontSize: 13 },
  aiContent: { gap: 10 },
  aiPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  aiPriceBox: { flex: 1, alignItems: 'center', backgroundColor: '#0F172A', padding: 14, borderRadius: 12 },
  aiPriceLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  aiPriceMin: { color: '#4ADE80', fontSize: 18, fontWeight: 'bold' },
  aiPriceMax: { color: '#f97316', fontSize: 18, fontWeight: 'bold' },
  aiSuggestedBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e3a5f', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF830' },
  aiSuggestedLabel: { color: '#94A3B8', fontSize: 13 },
  aiSuggestedValue: { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' },
  aiDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F172A', padding: 10, borderRadius: 10 },
  aiDetailLabel: { color: '#64748B', fontSize: 12, flex: 1 },
  aiDetailValue: { color: '#E5E7EB', fontSize: 12, fontWeight: 'bold' },
  aiBreakdownBox: { backgroundColor: '#0F172A', padding: 12, borderRadius: 10 },
  aiBreakdownText: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  aiTipBox: { flexDirection: 'row', gap: 8, backgroundColor: '#1c1917', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f9731630' },
  aiTipText: { color: '#f97316', fontSize: 12, flex: 1, lineHeight: 18 },
  useAiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#38BDF8', padding: 14, borderRadius: 14 },
  useAiBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },

  customContent: { gap: 4 },
  inputLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  priceInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 4, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  presetsLabel: { color: '#64748B', fontSize: 12, marginBottom: 8, marginTop: 4 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetBtn: { backgroundColor: '#0F172A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  presetBtnActive: { backgroundColor: '#1e3a5f', borderColor: '#38BDF8' },
  presetBtnText: { color: '#64748B', fontSize: 13 },
  presetBtnTextActive: { color: '#38BDF8', fontWeight: 'bold' },

  photoPreviewContainer: { marginBottom: 16, gap: 10 },
  photoPreview: { width: '100%', height: 200, borderRadius: 14 },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#334155', padding: 10, borderRadius: 10 },
  changePhotoBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  photoPickerBox: { backgroundColor: '#0F172A', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155', gap: 8 },
  photoPickerIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  photoPickerTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold' },
  photoPickerDesc: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  photoPickerBtns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  photoPickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1E293B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF830' },
  photoPickerBtnText: { color: '#38BDF8', fontWeight: '600', fontSize: 13 },
  completionBtns: { gap: 10 },
  completeWithPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#38BDF8', padding: 14, borderRadius: 14 },
  completeWithPhotoBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  completeWithoutPhotoBtn: { alignItems: 'center', backgroundColor: '#1E293B', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  completeWithoutPhotoBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
});