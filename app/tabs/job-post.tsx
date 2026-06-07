import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { API_URL, BASE_URL } from '../../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SKILLS = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'AC Technician', 'General'];

export default function JobPost() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [skillRequired, setSkillRequired] = useState('Plumber');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [image, setImage] = useState<any>(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    Alert.alert('Add Photo', 'Show technicians what needs to be fixed', [
      {
        text: '📷 Camera', onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled) setImage(res.assets[0]);
        }
      },
      {
        text: '🖼️ Gallery', onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled) setImage(res.assets[0]);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePost = async () => {
    if (!title.trim() || !description.trim() || !address.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all required fields' });
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('address', address);
      formData.append('skillRequired', skillRequired);
      formData.append('budgetMin', budgetMin || '0');
      formData.append('budgetMax', budgetMax || '0');

      if (image) {
        formData.append('image', {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: 'jobpost.jpg',
        } as any);
      }

      await axios.post(`${API_URL}/jobposts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Toast.show({
        type: 'success',
        text1: '✅ Job Posted!',
        text2: 'Technicians will start bidding soon',
      });
      setTimeout(() => router.push('/tabs/my-job-posts'), 1500);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to post job', text2: err?.response?.data?.msg || 'Try again' });
    } finally {
      setPosting(false);
    }
  };

  const topPadding = insets.top > 0 ? insets.top : 44;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={styles.title}>🔨 Post a Job</Text>
      <Text style={styles.subtitle}>Get bids from verified technicians near you</Text>

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>How Bidding Works</Text>
        <View style={styles.steps}>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>📝</Text>
            <Text style={styles.stepText}>Post your job</Text>
          </View>
          <Text style={styles.stepArrow}>→</Text>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>💰</Text>
            <Text style={styles.stepText}>Get bids</Text>
          </View>
          <Text style={styles.stepArrow}>→</Text>
          <View style={styles.step}>
            <Text style={styles.stepIcon}>✅</Text>
            <Text style={styles.stepText}>Pick best</Text>
          </View>
        </View>
      </View>

      {/* Job Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Job Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fix leaking pipe in bathroom"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Skill Required */}
      <View style={styles.section}>
        <Text style={styles.label}>Skill Required *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsRow}>
          {SKILLS.map(s => (
            <Pressable
              key={s}
              style={[styles.skillBtn, skillRequired === s && styles.skillBtnActive]}
              onPress={() => setSkillRequired(s)}
            >
              <Text style={[styles.skillBtnText, skillRequired === s && styles.skillBtnTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Job Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the problem in detail — what happened, how long ago, any previous repairs..."
          placeholderTextColor="#64748B"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.label}>Your Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. House 12, Street 5, Faisalabad"
          placeholderTextColor="#64748B"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      {/* Budget Range */}
      <View style={styles.section}>
        <Text style={styles.label}>Budget Range (Rs.) — Optional</Text>
        <View style={styles.budgetRow}>
          <TextInput
            style={[styles.input, styles.budgetInput]}
            placeholder="Min e.g. 500"
            placeholderTextColor="#64748B"
            value={budgetMin}
            onChangeText={setBudgetMin}
            keyboardType="numeric"
          />
          <Text style={styles.budgetDash}>—</Text>
          <TextInput
            style={[styles.input, styles.budgetInput]}
            placeholder="Max e.g. 2000"
            placeholderTextColor="#64748B"
            value={budgetMax}
            onChangeText={setBudgetMax}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.budgetHint}>Leave empty to let technicians suggest their price</Text>
      </View>

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.label}>Add Photo — Optional</Text>
        {image ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
            <Pressable style={styles.removeImageBtn} onPress={() => setImage(null)}>
              <Text style={styles.removeImageText}>✕ Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imagePickerBtn} onPress={pickImage}>
            <Text style={styles.imagePickerIcon}>📸</Text>
            <Text style={styles.imagePickerText}>Add a photo of the issue</Text>
            <Text style={styles.imagePickerSub}>Helps technicians give accurate bids</Text>
          </Pressable>
        )}
      </View>

      {/* Post Button */}
      <Pressable style={styles.postBtn} onPress={handlePost} disabled={posting}>
        {posting ? (
          <ActivityIndicator color="#0F172A" />
        ) : (
          <Text style={styles.postBtnText}>🔨 Post Job & Get Bids</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#38BDF8', marginBottom: 6 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 16 },
  howItWorks: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  howTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { alignItems: 'center', gap: 6 },
  stepIcon: { fontSize: 24 },
  stepText: { color: '#94A3B8', fontSize: 11, textAlign: 'center' },
  stepArrow: { color: '#334155', fontSize: 18 },
  section: { marginBottom: 16 },
  label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1E293B', color: '#E5E7EB', padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  skillsRow: { gap: 8, paddingVertical: 4 },
  skillBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  skillBtnActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  skillBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  skillBtnTextActive: { color: '#0F172A', fontWeight: 'bold' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetInput: { flex: 1 },
  budgetDash: { color: '#64748B', fontSize: 18 },
  budgetHint: { color: '#475569', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  imagePickerBtn: { backgroundColor: '#1E293B', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', gap: 6 },
  imagePickerIcon: { fontSize: 32 },
  imagePickerText: { color: '#E5E7EB', fontWeight: '600', fontSize: 14 },
  imagePickerSub: { color: '#64748B', fontSize: 12 },
  imagePreviewContainer: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  imagePreview: { width: '100%', height: 180 },
  removeImageBtn: { backgroundColor: '#450a0a', padding: 10, alignItems: 'center' },
  removeImageText: { color: '#f87171', fontWeight: 'bold', fontSize: 13 },
  postBtn: { backgroundColor: '#38BDF8', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  postBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 17 },
});