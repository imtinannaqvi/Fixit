import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert,
  Modal, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { API_URL, BASE_URL } from '../../config';

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const isTechnician = user?.role === 'technician';

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newAvatarAsset, setNewAvatarAsset] = useState<any>(null);
  const [stats, setStats] = useState({ totalBookings: 0, totalSpent: 0, memberSince: '' });

  useEffect(() => {
    if (user && !isTechnician) {
      fetchHomeownerStats();
      loadExtras();
    }
  }, [user]);

  const loadExtras = async () => {
    try {
      const extras = await AsyncStorage.getItem('homeowner_extras');
      if (extras) {
        const parsed = JSON.parse(extras);
        setEditPhone(parsed.phone || user?.phone || '');
        setEditAddress(parsed.address || user?.address || '');
        setEditCity(parsed.city || '');
        if (parsed.avatar) setAvatar(parsed.avatar);
      } else {
        setEditPhone(user?.phone || '');
        setEditAddress(user?.address || '');
      }
      setEditName(user?.name || '');
    } catch {}
  };

  const fetchHomeownerStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookings = res.data;
      const totalSpent = bookings
        .filter((b: any) => b.paymentStatus === 'Paid')
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
      setStats({
        totalBookings: bookings.length,
        totalSpent,
        memberSince: user?.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })
          : 'N/A',
      });
    } catch {}
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await logout();
          Toast.show({ type: 'success', text1: 'Logged out successfully' });
          router.replace('/');
        },
      },
    ]);
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditModal(true);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) return;
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled) { setAvatar(result.assets[0].uri); setNewAvatarAsset(result.assets[0]); }
      return;
    }
    Alert.alert('Profile Photo', 'Choose source', [
      {
        text: 'Camera', onPress: async () => {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!camPerm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) { setAvatar(result.assets[0].uri); setNewAvatarAsset(result.assets[0]); }
        }
      },
      {
        text: 'Gallery', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) { setAvatar(result.assets[0].uri); setNewAvatarAsset(result.assets[0]); }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const extras = { phone: editPhone, address: editAddress, city: editCity, avatar: newAvatarAsset ? avatar : avatar };
      await AsyncStorage.setItem('homeowner_extras', JSON.stringify(extras));
      await axios.put(`${API_URL}/auth/update-profile`, {
        name: editName, phone: editPhone, address: editAddress,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const updated = { ...parsed, name: editName, phone: editPhone, address: editAddress };
        await AsyncStorage.setItem('user', JSON.stringify(updated));
      }
      Toast.show({ type: 'success', text1: 'Profile Updated!' });
      setEditModal(false);
    } catch {
      const extras = { phone: editPhone, address: editAddress, city: editCity, avatar };
      await AsyncStorage.setItem('homeowner_extras', JSON.stringify(extras));
      Toast.show({ type: 'success', text1: 'Profile Saved Locally!' });
      setEditModal(false);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUri = () => {
    if (!avatar) return null;
    if (avatar.startsWith('http') || avatar.startsWith('file')) return avatar;
    return `${BASE_URL}${avatar}`;
  };

  const infoItems = [
    { label: 'Full Name',  value: editName || user?.name,                                icon: 'person-outline' as const },
    { label: 'Email',      value: user?.email,                                            icon: 'mail-outline' as const },
    { label: 'Phone',      value: editPhone || 'Not added',                               icon: 'call-outline' as const },
    { label: 'Address',    value: editAddress || 'Not added',                             icon: 'location-outline' as const },
    { label: 'City',       value: editCity || 'Not added',                                icon: 'business-outline' as const },
    { label: 'Role',       value: user?.role,                                             icon: 'shield-outline' as const },
    { label: 'Member ID',  value: (user?.id || user?._id)?.slice(-8)?.toUpperCase(),     icon: 'card-outline' as const },
  ];

  const techActions = [
    { icon: 'briefcase-outline' as const,  label: 'My Jobs',                  onPress: () => router.push('/tabs/technician-bookings' as any) },
    { icon: 'create-outline' as const,     label: 'Edit Technician Profile',  onPress: () => router.push('/tabs/edit-profile' as any) },
  ];

const homeActions = [
    { icon: 'clipboard-outline' as const,     label: 'My Bookings',      onPress: () => router.push('/tabs/bookings' as any) },
    { icon: 'hardware-chip-outline' as const, label: 'AI Diagnosis',     onPress: () => router.push('/tabs/diagnose' as any) },
    { icon: 'search-outline' as const,        label: 'Find Technicians', onPress: () => router.push('/tabs/explore' as any) },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={handleLogout} style={styles.logoutIconBtn}>
          <Ionicons name="log-out-outline" size={22} color="#f87171" />
        </Pressable>
      </View>

      {/* Avatar Card */}
      <View style={styles.avatarCard}>
        <Pressable onPress={!isTechnician ? pickAvatar : undefined} style={styles.avatarWrapper}>
          {getAvatarUri() ? (
            <Image source={{ uri: getAvatarUri()! }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          {!isTechnician && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#0F172A" />
            </View>
          )}
        </Pressable>

        <Text style={styles.name}>{editName || user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {editPhone ? (
          <View style={styles.extraRow}>
            <Ionicons name="call-outline" size={13} color="#94A3B8" />
            <Text style={styles.extraInfo}>{editPhone}</Text>
          </View>
        ) : null}
        {editAddress ? (
          <View style={styles.extraRow}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text style={styles.extraInfo}>{editAddress}{editCity ? `, ${editCity}` : ''}</Text>
          </View>
        ) : null}

        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, isTechnician ? styles.roleTech : styles.roleHome]}>
            <Ionicons
              name={isTechnician ? 'construct-outline' : 'home-outline'}
              size={13}
              color="#38BDF8"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.roleText}>
              {isTechnician ? 'Technician' : 'Homeowner'}
            </Text>
          </View>
        </View>

        {!isTechnician && (
          <Pressable style={styles.editProfileBtn} onPress={openEditModal}>
            <Ionicons name="create-outline" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </Pressable>
        )}
      </View>

      {/* Homeowner Stats */}
      {!isTechnician && (
        <View style={styles.statsRow}>
          {[
            { icon: 'clipboard-outline' as const, value: String(stats.totalBookings), label: 'Bookings',    color: '#38BDF8' },
            { icon: 'cash-outline' as const,      value: `Rs. ${stats.totalSpent.toLocaleString()}`, label: 'Total Spent', color: '#4ADE80' },
            { icon: 'calendar-outline' as const,  value: stats.memberSince || 'N/A', label: 'Member Since', color: '#f97316' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Technician Edit Banner */}
      {isTechnician && (
        <Pressable style={styles.editBanner} onPress={() => router.push('/tabs/edit-profile' as any)}>
          <View style={styles.editBannerLeft}>
            <Ionicons name="create-outline" size={20} color="#38BDF8" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.editBannerTitle}>Edit Your Profile</Text>
              <Text style={styles.editBannerSub}>Update skill, price, location & availability</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
        </Pressable>
      )}

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        {infoItems.map((item, i) => (
          <View key={i} style={[styles.infoRow, i === infoItems.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name={item.icon} size={16} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={[styles.infoValue, !item.value || item.value === 'Not added' ? styles.infoValueEmpty : {}]}>
                {item.value || 'Not added'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {(isTechnician ? techActions : homeActions).map((action, i) => (
          <Pressable
            key={i}
            style={[styles.actionRow, i === (isTechnician ? techActions : homeActions).length - 1 && { borderBottomWidth: 0 }]}
            onPress={action.onPress}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name={action.icon} size={18} color="#38BDF8" />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#334155" />
          </Pressable>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        {[
          { icon: 'code-slash-outline' as const,  label: 'Version',   value: '1.0.0' },
          { icon: 'layers-outline' as const,       label: 'Build',     value: 'Production' },
          { icon: 'people-outline' as const,       label: 'Developer', value: 'FixItNow Team' },
        ].map((item, i) => (
          <View key={i} style={[styles.infoRow, i === 2 && { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name={item.icon} size={16} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Logout */}
      {/* <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#f87171" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable> */}

      <View style={{ height: 100 }} />

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>

                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="create-outline" size={20} color="#38BDF8" style={{ marginRight: 8 }} />
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                  </View>
                  <Pressable onPress={() => setEditModal(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* Avatar */}
                <View style={styles.modalAvatarSection}>
                  <Pressable onPress={pickAvatar} style={styles.modalAvatarWrapper}>
                    {getAvatarUri() ? (
                      <Image source={{ uri: getAvatarUri()! }} style={styles.modalAvatarImg} />
                    ) : (
                      <View style={styles.modalAvatarPlaceholder}>
                        <Text style={styles.modalAvatarPlaceholderText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
                      </View>
                    )}
                    <View style={styles.cameraOverlay}>
                      <Ionicons name="camera" size={14} color="#0F172A" />
                    </View>
                  </Pressable>
                  <Text style={styles.avatarHint}>Tap to change photo</Text>
                </View>

                {/* Fields */}
                {[
                  { label: 'Full Name',     value: editName,    onChange: setEditName,    placeholder: 'Your full name',                    icon: 'person-outline' as const,   keyboard: 'default' as const },
                  { label: 'Phone Number',  value: editPhone,   onChange: setEditPhone,   placeholder: 'e.g. 03001234567',                  icon: 'call-outline' as const,     keyboard: 'phone-pad' as const },
                  { label: 'Home Address',  value: editAddress, onChange: setEditAddress, placeholder: 'e.g. House 12, Street 5, Gulberg',  icon: 'location-outline' as const, keyboard: 'default' as const },
                  { label: 'City',          value: editCity,    onChange: setEditCity,    placeholder: 'e.g. Faisalabad',                   icon: 'business-outline' as const, keyboard: 'default' as const },
                ].map((field, i) => (
                  <View key={i}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name={field.icon} size={16} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder={field.placeholder}
                        placeholderTextColor="#64748B"
                        keyboardType={field.keyboard}
                      />
                    </View>
                  </View>
                ))}

                <Pressable style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#0F172A" style={{ marginRight: 8 }} />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </Pressable>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 60, paddingHorizontal: 16 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#E5E7EB' },
  logoutIconBtn: { padding: 8, backgroundColor: '#450a0a', borderRadius: 10 },

  avatarCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  avatarWrapper: { position: 'relative', width: 90, height: 90, marginBottom: 12 },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#38BDF8' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#0F172A', fontSize: 36, fontWeight: 'bold' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#38BDF8', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1E293B' },
  name: { color: '#E5E7EB', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#64748B', fontSize: 14, marginBottom: 6 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  extraInfo: { color: '#94A3B8', fontSize: 13 },
  badgeRow: { flexDirection: 'row', marginTop: 10, marginBottom: 14 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleTech: { backgroundColor: '#1c1917' },
  roleHome: { backgroundColor: '#1e3a5f' },
  roleText: { color: '#38BDF8', fontWeight: '600', fontSize: 13 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e3a5f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF8' },
  editProfileBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statValue: { fontSize: 12, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' },
  statLabel: { color: '#64748B', fontSize: 10, textAlign: 'center' },

  editBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E3A5F', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#38BDF820' },
  editBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  editBannerTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  editBannerSub: { color: '#64748B', fontSize: 12 },

  section: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  infoIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: '#64748B', fontSize: 12, marginBottom: 2 },
  infoValue: { color: '#E5E7EB', fontSize: 14, fontWeight: '500' },
  infoValueEmpty: { color: '#475569', fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#334155' },
  actionIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionLabel: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#450a0a', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#7f1d1d' },
  logoutText: { color: '#f87171', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1E293B', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: '#334155', padding: 8, borderRadius: 10 },
  modalAvatarSection: { alignItems: 'center', marginBottom: 20 },
  modalAvatarWrapper: { position: 'relative', width: 80, height: 80 },
  modalAvatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#38BDF8' },
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  modalAvatarPlaceholderText: { color: '#0F172A', fontSize: 32, fontWeight: 'bold' },
  avatarHint: { color: '#64748B', fontSize: 12, marginTop: 8 },

  inputLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  modalInput: { flex: 1, color: '#E5E7EB', paddingVertical: 14, fontSize: 15 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});