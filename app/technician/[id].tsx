import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, TextInput, Image, Animated,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { Audio } from 'expo-av';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { API_URL, BASE_URL } from '../../config';

export default function TechnicianDetail() {
  const params = useLocalSearchParams();
  const segments = useSegments();
  const router = useRouter();
  const { token } = useAuth();

  const id = params.id || segments[segments.length - 1];
  const distanceKm = params.distanceKm ? parseFloat(params.distanceKm as string) : null;

  const [technician, setTechnician] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [issue, setIssue] = useState('');
  const [address, setAddress] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  const [bookingType, setBookingType] = useState<'single' | 'group'>('single');
  const [societyName, setSocietyName] = useState('');
  const [units, setUnits] = useState<{ address: string }[]>([
    { address: '' },
    { address: '' },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (id && id !== '[id]') {
      fetchTechnician();
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const fetchTechnician = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/technicians/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTechnician(res.data);
    } catch (err: any) {
      console.log('Fetch error:', err?.response?.data || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_URL}/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(res.data);
    } catch (err) {
      console.log('Reviews error:', err);
    }
  };

  const startRecording = async () => {
    try {
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission required', text2: 'Microphone access needed' });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      Toast.show({ type: 'success', text1: '🎙️ Get ready...', text2: 'Recording starts in 1 second' });
      await new Promise(resolve => setTimeout(resolve, 800));
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      Toast.show({ type: 'success', text1: '🔴 Recording now!', text2: 'Speak your issue in English or Urdu' });
    } catch (err: any) {
      try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch {}
      recordingRef.current = null;
      setIsRecording(false);
      Toast.show({ type: 'error', text1: 'Could not start recording', text2: 'Try again' });
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || !isRecording) return;
    setIsRecording(false);
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: false });
      const uri = recording.getURI();
      if (!uri) return;
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);
      const res = await axios.post(`${BASE_URL}/api/transcribe`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      console.log('Voice response:', res.data);
      const capturedText = res.data.text || res.data.original || '';
      if (capturedText.trim()) {
        setIssue(prev => prev ? `${prev} ${capturedText}` : capturedText);
        Toast.show({ type: 'success', text1: '🎙️ Voice captured!', text2: capturedText.slice(0, 60) });
      } else if (res.data.msg === 'Could not detect clear speech') {
        Toast.show({ type: 'error', text1: '🎙️ Could not hear clearly', text2: 'Please hold mic close and speak again' });
      } else {
        Toast.show({ type: 'error', text1: 'Nothing detected', text2: 'Please speak clearly and try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Transcription failed', text2: 'Try again' });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleBooking = async () => {
    if (!issue || !address) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all fields' });
      return;
    }
    setBooking(true);
    try {
      await axios.post(`${API_URL}/bookings`, {
        technicianId: id, issue, address,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Toast.show({ type: 'success', text1: '✅ Booking Confirmed!', text2: 'Technician will contact you soon' });
      setTimeout(() => router.push('/tabs/bookings'), 1500);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Booking Failed', text2: err?.response?.data?.msg || 'Try again' });
    } finally {
      setBooking(false);
    }
  };

  const handleGroupBooking = async () => {
    if (!issue.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please describe the issue' });
      return;
    }
    if (!societyName.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter society/building name' });
      return;
    }
    const validUnits = units.filter(u => u?.address?.trim());
    if (validUnits.length < 2) {
      Toast.show({ type: 'error', text1: 'Add at least 2 addresses', text2: 'Group booking needs minimum 2 houses' });
      return;
    }
    setBooking(true);
    try {
      const res = await axios.post(`${API_URL}/bookings/group`, {
        technicianId: id,
        issue,
        societyName,
        address: validUnits[0].address || societyName,
        units: validUnits,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Toast.show({
        type: 'success',
        text1: '📦 Group Booking Confirmed!',
        text2: `${validUnits.length} houses · ${res.data.discountPercent}% discount applied`,
      });
      setTimeout(() => router.push('/tabs/bookings'), 1500);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Group Booking Failed', text2: err?.response?.data?.msg || 'Try again' });
    } finally {
      setBooking(false);
    }
  };

  const addUnit = () => setUnits(prev => [...prev, { address: '' }]);

  const removeUnit = (index: number) => {
    if (units.length <= 2) {
      Toast.show({ type: 'error', text1: 'Minimum 2 houses required' });
      return;
    }
    setUnits(prev => prev.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, value: string) =>
    setUnits(prev => prev.map((u, i) => i === index ? { address: value } : u));

  const getDiscount = () => {
    const count = units.filter(u => u?.address?.trim()).length;
    if (count >= 10) return 20;
    if (count >= 5) return 15;
    if (count >= 3) return 10;
    return 0;
  };

  const getDiscountedPrice = () => {
    if (!technician) return 0;
    const discount = getDiscount();
    return Math.round(technician.price * (1 - discount / 100));
  };

  const getAvatarUri = (avatar: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `${BASE_URL}${avatar}`;
  };

  const getDistanceColor = (km: number) => {
    if (km <= 5) return { bg: '#052e16', text: '#4ADE80', label: 'Very Close' };
    if (km <= 15) return { bg: '#1e3a5f', text: '#38BDF8', label: 'Nearby' };
    return { bg: '#1c1917', text: '#f97316', label: 'Far' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#38BDF8" size="large" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!technician) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Technician not found</Text>
      </View>
    );
  }

  const distColor = distanceKm !== null ? getDistanceColor(distanceKm) : null;
  const validUnitCount = units.filter(u => u?.address?.trim()).length;
  const discount = getDiscount();
  const discountedPrice = getDiscountedPrice();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0F172A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60 }}
      >

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {technician.avatar ? (
            <Image source={{ uri: getAvatarUri(technician.avatar) }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{technician.name[0]}</Text>
            </View>
          )}
          <Text style={styles.name}>{technician.name}</Text>
          <Text style={styles.skill}>{technician.skill}</Text>
          <Text style={styles.location}>📍 {technician.location}</Text>

          {distanceKm !== null && distColor && (
            <View style={[styles.distanceBadge, { backgroundColor: distColor.bg }]}>
              <Text style={[styles.distanceText, { color: distColor.text }]}>
                📏 {distanceKm} km away · {distColor.label}
              </Text>
            </View>
          )}

          <View style={[styles.badge, technician.available ? styles.badgeGreen : styles.badgeRed]}>
            <Text style={[styles.badgeText, { color: technician.available ? '#4ADE80' : '#f87171' }]}>
              {technician.available ? '✅ Available Now' : '❌ Currently Busy'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: `⭐ ${technician.rating}`, label: 'Rating' },
            { value: `💬 ${technician.reviews}`, label: 'Reviews' },
            { value: `✅ ${technician.jobsDone}`, label: 'Jobs Done' },
            { value: `🏆 ${technician.experience}`, label: 'Yrs Exp' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{technician.description || 'No description provided.'}</Text>
        </View>

        {/* Price */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Hourly Rate</Text>
            <Text style={styles.priceSub}>Cash on Delivery</Text>
          </View>
          <Text style={styles.priceValue}>Rs. {technician.price} / hr</Text>
        </View>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Reviews ({reviews.length})</Text>
            {reviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.userName}</Text>
                  <Text style={styles.reviewRating}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Booking Form */}
        {showBookingForm ? (
          <View style={styles.bookingForm}>

            {/* Type Toggle */}
            <View style={styles.bookingTypeRow}>
              <Pressable
                style={[styles.bookingTypeBtn, bookingType === 'single' && styles.bookingTypeBtnActive]}
                onPress={() => setBookingType('single')}
              >
                <Text style={[styles.bookingTypeBtnText, bookingType === 'single' && styles.bookingTypeBtnTextActive]}>
                  🏠 Single House
                </Text>
              </Pressable>
              <Pressable
                style={[styles.bookingTypeBtn, bookingType === 'group' && styles.bookingTypeBtnActive]}
                onPress={() => setBookingType('group')}
              >
                <Text style={[styles.bookingTypeBtnText, bookingType === 'group' && styles.bookingTypeBtnTextActive]}>
                  🏘️ Group / Colony
                </Text>
              </Pressable>
            </View>

            {/* Group discount banner */}
            {bookingType === 'group' && (
              <View style={styles.discountBanner}>
                <Text style={styles.discountBannerTitle}>🎉 Group Discounts Available</Text>
                <View style={styles.discountTiers}>
                  {[
                    { label: '3+ houses', value: '10% off', active: validUnitCount >= 3 },
                    { label: '5+ houses', value: '15% off', active: validUnitCount >= 5 },
                    { label: '10+ houses', value: '20% off', active: validUnitCount >= 10 },
                  ].map((t, i) => (
                    <View key={i} style={[styles.discountTier, t.active && styles.discountTierActive]}>
                      <Text style={styles.discountTierText}>{t.label}</Text>
                      <Text style={styles.discountTierValue}>{t.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              {bookingType === 'group' ? '📦 Group Booking' : '📅 Book This Technician'}
            </Text>

            {/* Issue field */}
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Describe The Issue</Text>
              <Text style={styles.voiceHint}>🎙️ tap mic or type</Text>
            </View>
            <View style={styles.inputWithMic}>
              <TextInput
                style={styles.inputMic}
                placeholder="e.g. Water pipe leaking under kitchen sink"
                placeholderTextColor="#64748B"
                value={issue}
                onChangeText={setIssue}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                scrollEnabled={false}
              />
              <Pressable
                style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#38BDF8" size="small" />
                ) : (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Text style={styles.micBtnText}>{isRecording ? '🔴' : '🎙️'}</Text>
                  </Animated.View>
                )}
              </Pressable>
            </View>

            {isRecording && (
              <View style={styles.recordingStatus}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingStatusText}>Recording... Tap 🔴 to stop</Text>
              </View>
            )}
            {isTranscribing && (
              <View style={styles.recordingStatus}>
                <ActivityIndicator color="#38BDF8" size="small" />
                <Text style={styles.recordingStatusText}>🤖 Translating to English...</Text>
              </View>
            )}

            {/* Single Booking */}
            {bookingType === 'single' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 8, marginBottom: 6 }]}>Your Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. House 12, Street 5, Faisalabad"
                  placeholderTextColor="#64748B"
                  value={address}
                  onChangeText={setAddress}
                  returnKeyType="done"
                />
                <View style={styles.priceSummary}>
                  <Text style={styles.priceSummaryLabel}>Estimated Cost</Text>
                  <Text style={styles.priceSummaryValue}>Rs. {technician.price} / hr</Text>
                </View>
                <View style={styles.btnRow}>
                  <Pressable style={styles.cancelBtn} onPress={() => setShowBookingForm(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.bookBtn} onPress={handleBooking} disabled={booking}>
                    {booking
                      ? <ActivityIndicator color="#0F172A" />
                      : <Text style={styles.bookBtnText}>✅ Confirm Booking</Text>
                    }
                  </Pressable>
                </View>
              </>
            )}

            {/* Group Booking */}
            {bookingType === 'group' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 8, marginBottom: 6 }]}>Colony / Area Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Gulberg Colony, Street 4"
                  placeholderTextColor="#64748B"
                  value={societyName}
                  onChangeText={setSocietyName}
                  returnKeyType="next"
                />

                <View style={styles.unitsHeader}>
                  <Text style={styles.inputLabel}>Houses ({validUnitCount} added)</Text>
                  <Pressable style={styles.addUnitBtn} onPress={addUnit}>
                    <Text style={styles.addUnitBtnText}>+ Add House</Text>
                  </Pressable>
                </View>

                {units.map((unit, index) => (
                  <View key={index} style={styles.unitRow}>
                    <View style={styles.unitNumber}>
                      <Text style={styles.unitNumberLabel}>House {index + 1}</Text>
                      <TextInput
                        style={styles.unitInput}
                        placeholder="e.g. House 12, Street 5"
                        placeholderTextColor="#64748B"
                        value={unit.address}
                        onChangeText={(v) => updateUnit(index, v)}
                        returnKeyType="next"
                      />
                    </View>
                    <Pressable style={styles.removeUnitBtn} onPress={() => removeUnit(index)}>
                      <Text style={styles.removeUnitBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                <View style={styles.groupPriceSummary}>
                  <View style={styles.groupPriceRow}>
                    <Text style={styles.groupPriceLabel}>Original Price / house</Text>
                    <Text style={styles.groupPriceOriginal}>Rs. {technician.price}</Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.groupPriceRow}>
                      <Text style={styles.groupPriceLabel}>Group Discount</Text>
                      <Text style={styles.groupPriceDiscount}>-{discount}%</Text>
                    </View>
                  )}
                  <View style={[styles.groupPriceRow, styles.groupPriceTotalRow]}>
                    <Text style={styles.groupPriceTotalLabel}>Price / house after discount</Text>
                    <Text style={styles.groupPriceTotalValue}>Rs. {discountedPrice}</Text>
                  </View>
                  <View style={styles.groupPriceRow}>
                    <Text style={styles.groupPriceLabel}>Total ({validUnitCount} houses)</Text>
                    <Text style={styles.groupPriceTotalValue}>Rs. {discountedPrice * validUnitCount}</Text>
                  </View>
                </View>

                {discount > 0 && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>
                      🎉 You save Rs. {(technician.price - discountedPrice) * validUnitCount} with group booking!
                    </Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <Pressable style={styles.cancelBtn} onPress={() => setShowBookingForm(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.bookBtn} onPress={handleGroupBooking} disabled={booking}>
                    {booking
                      ? <ActivityIndicator color="#0F172A" />
                      : <Text style={[styles.bookBtnText, { fontSize: 13 }]}>📦 Confirm Group Booking</Text>
                    }
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : (
          <Pressable
            style={[styles.bookNowBtn, !technician.available && styles.bookNowBtnDisabled]}
            onPress={() => technician.available && setShowBookingForm(true)}
          >
            <Text style={styles.bookNowBtnText}>
              {technician.available ? '📅 Book Now' : '❌ Not Available'}
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },
  errorText: { color: '#E5E7EB', fontSize: 18, marginBottom: 16 },
  profileCard: { alignItems: 'center', padding: 24, backgroundColor: '#1E293B', margin: 16, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#38BDF8', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#0F172A', fontSize: 40, fontWeight: 'bold' },
  name: { color: '#E5E7EB', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  skill: { color: '#38BDF8', fontSize: 16, marginBottom: 4 },
  location: { color: '#64748B', fontSize: 14, marginBottom: 10 },
  distanceBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  distanceText: { fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#052e16' },
  badgeRed: { backgroundColor: '#450a0a' },
  badgeText: { fontWeight: '600', fontSize: 13 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statValue: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#64748B', fontSize: 11 },
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1E293B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  aboutText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
  priceCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1E3A5F', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#38BDF820' },
  priceLabel: { color: '#94A3B8', fontSize: 14, marginBottom: 2 },
  priceSub: { color: '#64748B', fontSize: 11 },
  priceValue: { color: '#4ADE80', fontSize: 20, fontWeight: 'bold' },
  reviewCard: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewerName: { color: '#E5E7EB', fontWeight: 'bold', fontSize: 14 },
  reviewRating: { color: '#FBBF24', fontSize: 14 },
  reviewComment: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 4 },
  reviewDate: { color: '#475569', fontSize: 11 },
  bookingForm: { margin: 16, backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: '#334155' },
  bookingTypeRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 12, padding: 4, marginBottom: 16 },
  bookingTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  bookingTypeBtnActive: { backgroundColor: '#38BDF8' },
  bookingTypeBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  bookingTypeBtnTextActive: { color: '#0F172A', fontWeight: 'bold' },
  discountBanner: { backgroundColor: '#052e16', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#4ADE80' },
  discountBannerTitle: { color: '#4ADE80', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  discountTiers: { flexDirection: 'row', gap: 8 },
  discountTier: { flex: 1, backgroundColor: '#0F172A', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  discountTierActive: { backgroundColor: '#052e16', borderColor: '#4ADE80' },
  discountTierText: { color: '#64748B', fontSize: 11, marginBottom: 3 },
  discountTierValue: { color: '#4ADE80', fontWeight: 'bold', fontSize: 13 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  inputLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  voiceHint: { color: '#38BDF8', fontSize: 11, fontWeight: '500' },
  inputWithMic: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-end' },
  inputMic: { flex: 1, backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155', minHeight: 90, textAlignVertical: 'top' },
  micBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#38BDF8', marginBottom: 4 },
  micBtnText: { fontSize: 22 },
  micBtnRecording: { backgroundColor: '#450a0a', borderColor: '#f87171' },
  recordingStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, backgroundColor: '#0F172A', padding: 10, borderRadius: 10 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  recordingStatusText: { color: '#94A3B8', fontSize: 12, flex: 1 },
  input: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  priceSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: 12, borderRadius: 12, marginBottom: 16 },
  priceSummaryLabel: { color: '#64748B', fontSize: 13 },
  priceSummaryValue: { color: '#4ADE80', fontSize: 15, fontWeight: 'bold' },
  unitsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addUnitBtn: { backgroundColor: '#1e3a5f', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#38BDF8' },
  addUnitBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 12 },
  unitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  unitNumber: { flex: 1 },
  unitNumberLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  unitInput: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 12, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  removeUnitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#450a0a', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  removeUnitBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 14 },
  groupPriceSummary: { backgroundColor: '#0F172A', borderRadius: 14, padding: 14, marginBottom: 12, marginTop: 8 },
  groupPriceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  groupPriceLabel: { color: '#64748B', fontSize: 13 },
  groupPriceOriginal: { color: '#E5E7EB', fontSize: 13 },
  groupPriceDiscount: { color: '#4ADE80', fontSize: 13, fontWeight: 'bold' },
  groupPriceTotalRow: { borderBottomWidth: 0, marginTop: 4 },
  groupPriceTotalLabel: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold' },
  groupPriceTotalValue: { color: '#4ADE80', fontSize: 16, fontWeight: 'bold' },
  savingsBadge: { backgroundColor: '#052e16', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#4ADE80' },
  savingsBadgeText: { color: '#4ADE80', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontWeight: '600' },
  bookBtn: { flex: 2, backgroundColor: '#38BDF8', padding: 14, borderRadius: 12, alignItems: 'center' },
  bookBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  bookNowBtn: { margin: 16, backgroundColor: '#38BDF8', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
  bookNowBtnDisabled: { backgroundColor: '#334155' },
  bookNowBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 17 },
});