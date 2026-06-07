import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { API_URL, BASE_URL } from '../../config';
const SKILLS = ['General', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'AC Technician'];

export default function EditProfile() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skill, setSkill] = useState('General');
  const [price, setPrice] = useState('500');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [experience, setExperience] = useState('1');
  const [available, setAvailable] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/technicians/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const t = res.data;
      setSkill(t.skill || 'General');
      setPrice(t.price?.toString() || '500');
      setLocation(t.location || '');
      setDescription(t.description || '');
      setExperience(t.experience?.toString() || '1');
      setAvailable(t.available ?? true);
      if (t.avatar) setAvatar(t.avatar);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission required', text2: 'Please allow photo access' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setNewImage(result.assets[0]);
      setAvatar(result.assets[0].uri);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!newImage) return null;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: newImage.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await axios.post(`${API_URL}/technicians/upload-avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data.avatarUrl;
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Image upload failed' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!location.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your location' });
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = avatar;
      if (newImage) {
        const uploaded = await uploadImage();
        if (uploaded) avatarUrl = uploaded;
      }

      await axios.put(`${API_URL}/technicians/profile`, {
        skill,
        price: parseInt(price) || 500,
        location,
        description,
        experience: parseInt(experience) || 1,
        available,
        avatar: avatarUrl,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Toast.show({ type: 'success', text1: '✅ Profile Updated!', text2: 'Your changes have been saved' });
      setTimeout(() => router.back(), 1000);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#38BDF8" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      {/* Profile Image */}
      <View style={styles.avatarSection}>
        <Pressable onPress={pickImage} style={styles.avatarWrapper}>
         {avatar ? (
  <Image
    source={{ uri: avatar.startsWith('/uploads') ? `${BASE_URL}${avatar}` : avatar }}
    style={styles.avatarImage}
  />
) : (
  <View style={styles.avatarPlaceholder}>
    <Text style={styles.avatarPlaceholderText}>👤</Text>
  </View>
)}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Tap to change profile photo</Text>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityCard}>
        <View>
          <Text style={styles.availabilityTitle}>Availability Status</Text>
          <Text style={styles.availabilitySubtitle}>
            {available ? '✅ You are visible to customers' : '🔴 You are hidden from customers'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ false: '#450a0a', true: '#052e16' }}
          thumbColor={available ? '#4ADE80' : '#f87171'}
        />
      </View>

      {/* Skill Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Your Skill / Service</Text>
        <View style={styles.skillsGrid}>
          {SKILLS.map((s) => (
            <Pressable
              key={s}
              style={[styles.skillBtn, skill === s && styles.skillBtnActive]}
              onPress={() => setSkill(s)}
            >
              <Text style={[styles.skillText, skill === s && styles.skillTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Price */}
      <View style={styles.section}>
        <Text style={styles.label}>Hourly Rate (Rs.)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="e.g. 800"
          placeholderTextColor="#64748B"
        />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.label}>Your Location / Area</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Gulberg, Lahore"
          placeholderTextColor="#64748B"
        />
      </View>

      {/* Experience */}
      <View style={styles.section}>
        <Text style={styles.label}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          keyboardType="numeric"
          placeholder="e.g. 3"
          placeholderTextColor="#64748B"
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>About You</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your skills and experience..."
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving || uploadingImage}>
        {saving || uploadingImage
          ? <ActivityIndicator color="#0F172A" />
          : <Text style={styles.saveBtnText}>💾 Save Changes</Text>
        }
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { backgroundColor: '#1E293B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backText: { color: '#38BDF8', fontWeight: '600', fontSize: 14 },
  title: { color: '#E5E7EB', fontSize: 22, fontWeight: 'bold' },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { position: 'relative', width: 100, height: 100 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#38BDF8' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#334155' },
  avatarPlaceholderText: { fontSize: 40 },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#38BDF8', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0F172A' },
  cameraIcon: { fontSize: 16 },
  avatarHint: { color: '#64748B', fontSize: 12, marginTop: 8 },

  availabilityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 8 },
  availabilityTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  availabilitySubtitle: { color: '#64748B', fontSize: 13 },
  section: { marginHorizontal: 16, marginTop: 16 },
  label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1E293B', color: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  skillBtnActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  skillText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  skillTextActive: { color: '#0F172A', fontWeight: 'bold' },
  saveBtn: { marginHorizontal: 16, marginTop: 30, backgroundColor: '#38BDF8', padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
});