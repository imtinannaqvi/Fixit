import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert, Dimensions,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { BASE_URL } from '../../../config';

const { width } = Dimensions.get('window');

const SERVICES = [
  { label: 'Plumber',     icon: 'water-outline',        skill: 'Plumber',       color: '#1e3a5f' },
  { label: 'Electrician', icon: 'flash-outline',         skill: 'Electrician',   color: '#1c1917' },
  { label: 'Carpenter',   icon: 'hammer-outline',        skill: 'Carpenter',     color: '#052e16' },
  { label: 'Painter',     icon: 'color-palette-outline', skill: 'Painter',       color: '#2e1065' },
  { label: 'AC Tech',     icon: 'snow-outline',          skill: 'AC Technician', color: '#0c4a6e' },
];

const TIPS = [
  { icon: 'water-outline',          title: 'Prevent Pipe Leaks',  desc: 'Check pipe joints every 6 months to avoid costly repairs' },
  { icon: 'flash-outline',          title: 'Electrical Safety',   desc: 'Never overload sockets — use surge protectors for appliances' },
  { icon: 'thermometer-outline',    title: 'AC Maintenance',      desc: 'Clean AC filters monthly for better cooling and efficiency' },
  { icon: 'resize-outline',         title: 'Window Sealing',      desc: 'Seal window gaps before winter to save on heating costs' },
];

const SKILL_MAP: any = {
  'Plumbing Leak':    'Plumber',
  'Electrical Issue': 'Electrician',
  'Carpentry Issue':  'Carpenter',
  'Painting Issue':   'Painter',
  'AC Issue':         'AC Technician',
};

const getSeasonData = () => {
  const month = new Date().getMonth() + 1;

  if (month >= 4 && month <= 6) {
    return {
      season: 'Summer', icon: 'sunny-outline', color: '#f97316', bg: '#1c1917', border: '#f97316',
      tagline: 'Beat the heat — service your AC before it breaks',
      surge: { skills: ['AC Technician', 'Plumber'], percent: 15 },
      packages: [
        { icon: 'snow-outline',          title: 'AC Summer Package',  desc: 'Full AC service + gas refill + filter cleaning',            price: 2500, originalPrice: 3000, skill: 'AC Technician', color: '#0c4a6e' },
        { icon: 'water-outline',         title: 'Water Tank Clean',   desc: 'Tank cleaning + pipe check + pressure test',               price: 1800, originalPrice: 2200, skill: 'Plumber',       color: '#1e3a5f' },
        { icon: 'flash-outline',         title: 'Summer Electrical',  desc: 'Check overloaded circuits + UPS wiring + fan service',     price: 1500, originalPrice: 1800, skill: 'Electrician',   color: '#1c1917' },
      ],
      tips: ['Service your AC before May — prices rise after', 'Check water tanks monthly in summer', 'Avoid overloading sockets during load-shedding'],
    };
  }

  if (month >= 7 && month <= 9) {
    return {
      season: 'Monsoon', icon: 'rainy-outline', color: '#38BDF8', bg: '#0c1a2e', border: '#38BDF8',
      tagline: 'Protect your home before the rains damage it',
      surge: { skills: ['Electrician', 'Plumber', 'Painter'], percent: 20 },
      packages: [
        { icon: 'home-outline',          title: 'Roof Waterproofing', desc: 'Roof inspection + waterproof coating + drain check',        price: 4500, originalPrice: 5500, skill: 'Painter',       color: '#1e3a5f' },
        { icon: 'flash-outline',         title: 'Rain Safety Check',  desc: 'Earthing check + circuit breaker test + socket sealing',   price: 2000, originalPrice: 2500, skill: 'Electrician',   color: '#1c1917' },
        { icon: 'water-outline',         title: 'Drainage Package',   desc: 'Drain clearing + pipe inspection + leak sealing',          price: 2200, originalPrice: 2800, skill: 'Plumber',       color: '#052e16' },
      ],
      tips: ['Waterproof your roof before July', 'Get earthing checked — risk of electrocution in rain', 'Clear drains before monsoon season starts'],
    };
  }

  if (month >= 10 || month <= 2) {
    return {
      season: 'Winter', icon: 'snow-outline', color: '#94A3B8', bg: '#0f1a2e', border: '#64748B',
      tagline: 'Prepare your home for cold nights',
      surge: { skills: ['General', 'Carpenter'], percent: 10 },
      packages: [
        { icon: 'flame-outline',         title: 'Geyser Service',      desc: 'Geyser inspection + element check + safety valve',         price: 1200, originalPrice: 1500, skill: 'Plumber',   color: '#1e3a5f' },
        { icon: 'home-outline',          title: 'Door & Window Seal',  desc: 'Seal gaps + weather stripping + lock repair',             price: 1500, originalPrice: 1800, skill: 'Carpenter', color: '#052e16' },
        { icon: 'construct-outline',     title: 'Gas Line Safety',     desc: 'Gas pipe inspection + pressure check + leak test',        price: 1800, originalPrice: 2200, skill: 'General',   color: '#1c1917' },
      ],
      tips: ['Service your geyser before first cold spell', 'Seal doors and windows to save on heating', 'Get gas lines checked before winter'],
    };
  }

  return {
    season: 'Spring', icon: 'flower-outline', color: '#4ADE80', bg: '#052e16', border: '#4ADE80',
    tagline: 'Time for a home refresh before summer',
    surge: { skills: ['Painter'], percent: 0 },
    packages: [
      { icon: 'color-palette-outline',   title: 'Spring Paint Package', desc: 'Interior wall painting + ceiling touch up + putty work',  price: 5000, originalPrice: 6000, skill: 'Painter',       color: '#2e1065' },
      { icon: 'brush-outline',           title: 'Deep Clean & Repair',  desc: 'Fix minor damages + patch walls + clean drains',          price: 2500, originalPrice: 3000, skill: 'General',       color: '#1E293B' },
      { icon: 'snow-outline',            title: 'AC Pre-Season Check',  desc: 'Service AC before summer rush — save 20%',               price: 2000, originalPrice: 2500, skill: 'AC Technician', color: '#0c4a6e' },
    ],
    tips: ['Best time to paint before summer heat', 'Book AC service early before prices rise', 'Fix winter damage before it gets worse'],
  };
};

const QUICK_ACTIONS = [
  { icon: 'hardware-chip-outline' as const, title: 'AI Diagnosis',  desc: 'Identify issues with photo', style: 'actionPrimary',    route: '/tabs/diagnose' },
  { icon: 'search-outline' as const,        title: 'Find Expert',   desc: 'Browse technicians',         style: 'actionSecondary',  route: '/tabs/explore'  },
  { icon: 'clipboard-outline' as const,     title: 'My Bookings',   desc: 'Track your requests',        style: 'actionTertiary',   route: '/tabs/bookings' },
  { icon: 'chatbubble-ellipses-outline' as const, title: 'FixBot', desc: 'AI chat assistant',          style: 'actionQuaternary', route: null             },
];

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const seasonData = getSeasonData();

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { id: '1', from: 'bot', text: "Hi! I'm FixBot 🤖\n\nHow can I help you today? Describe your home issue or send a photo and I'll guide you to the right expert!" }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [detectedSkill, setDetectedSkill] = useState<string | null>(null);
  const flatListRef = useRef<any>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), from: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const response = await fetch(`${BASE_URL}/api/fixbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = await response.json();
      const botMsg = { id: (Date.now() + 1).toString(), from: 'bot', text: data.reply, skill: data.skill };
      setMessages(prev => [...prev, botMsg]);
      if (data.skill) setDetectedSkill(data.skill);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: 'bot', text: "Sorry, I'm having trouble connecting. Please try again!" }]);
    } finally {
      setTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Send Image to FixBot', 'FixBot will analyze your photo and identify the issue', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission required', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets[0]) analyzeImage(result.assets[0]);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission required', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets[0]) analyzeImage(result.assets[0]);
  };

  const analyzeImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const userImgMsg = { id: `user-img-${Date.now()}`, from: 'user', text: 'Photo sent for analysis', imageUri: asset.uri };
    setMessages(prev => [...prev, userImgMsg]);
    setAnalyzingImage(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: 'photo.jpg' } as any);
      const res = await fetch(`${BASE_URL}/detect`, { method: 'POST', body: formData });
      const data = await res.json();
      const { faultType, description, severity, recommendation } = data;
      const severityLabel = severity === 'High' ? 'High' : severity === 'Medium' ? 'Medium' : 'Low';
      const detectedTechSkill = SKILL_MAP[faultType] || null;
      const aiReply = `AI Fault Analysis Complete!\n\nFault: ${faultType}\n${description}\nSeverity: ${severityLabel}\n${recommendation}`;
      const botMsg = { id: `bot-img-${Date.now()}`, from: 'bot', text: aiReply, skill: detectedTechSkill };
      setMessages(prev => [...prev, botMsg]);
      if (detectedTechSkill) setDetectedSkill(detectedTechSkill);
    } catch {
      setMessages(prev => [...prev, { id: `bot-err-${Date.now()}`, from: 'bot', text: "Sorry, I couldn't analyze that image. Please try a clearer photo!" }]);
    } finally {
      setAnalyzingImage(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleFindExpert = () => {
    setChatOpen(false);
    setDetectedSkill(null);
    router.push({ pathname: '/tabs/explore', params: { skill: detectedSkill || 'All' } });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{user?.name || 'User'}</Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={user?.role === 'technician' ? 'construct-outline' : 'home-outline'}
                size={11}
                color="#38BDF8"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.roleText}>
                {user?.role === 'technician' ? 'Technician Account' : 'Homeowner Account'}
              </Text>
            </View>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            {(() => {
              const avatarUrl = (user as any)?.avatar;
              if (avatarUrl) {
                const uri = avatarUrl.startsWith('http') ? avatarUrl : `${BASE_URL}${avatarUrl}`;
                return <Image source={{ uri }} style={styles.headerAvatar} onError={() => {}} />;
              }
              const initial = user?.name?.[0]?.toUpperCase() || '?';
              return (
                <View style={styles.headerAvatarFallback}>
                  <Text style={styles.headerAvatarText}>{initial}</Text>
                </View>
              );
            })()}
          </Pressable>
        </View>

        {/* ── Hero Banner ── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <View style={styles.heroTagRow}>
              <Ionicons name="flash" size={12} color="#38BDF8" />
              <Text style={styles.heroTag}>AI Powered</Text>
            </View>
            <Text style={styles.heroTitle}>Fix Your Home{'\n'}The Smart Way</Text>
            <Text style={styles.heroDesc}>Instant diagnosis + verified experts at your doorstep</Text>
            <Pressable style={styles.heroBtn} onPress={() => router.push('/tabs/diagnose')}>
              <Ionicons name="hardware-chip-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.heroBtnText}>Try AI Diagnosis</Text>
            </Pressable>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="home" size={52} color="#38BDF8" />
          </View>
        </View>

        {/* ── FixBot Banner ── */}
        <Pressable style={styles.botBanner} onPress={() => setChatOpen(true)}>
          <View style={styles.botIconBox}>
            <Ionicons name="hardware-chip" size={26} color="#38BDF8" />
          </View>
          <View style={styles.botBannerText}>
            <Text style={styles.botBannerTitle}>FixBot Assistant</Text>
            <Text style={styles.botBannerDesc}>Describe your issue or send a photo!</Text>
          </View>
          <View style={styles.botBannerBtn}>
            <Text style={styles.botBannerBtnText}>Chat</Text>
            <Ionicons name="chevron-forward" size={14} color="#0F172A" />
          </View>
        </Pressable>

        {/* ── Seasonal Banner ── */}
        <View style={[styles.seasonBanner, { backgroundColor: seasonData.bg, borderColor: seasonData.border }]}>
          <View style={styles.seasonBannerTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.seasonTagRow}>
                <Ionicons name={seasonData.icon as any} size={16} color={seasonData.color} />
                <Text style={[styles.seasonBannerTag, { color: seasonData.color }]}>{seasonData.season} Season</Text>
              </View>
              <Text style={styles.seasonBannerTitle}>{seasonData.tagline}</Text>
            </View>
            {seasonData.surge.percent > 0 && (
              <View style={[styles.surgeBadge, { borderColor: seasonData.color }]}>
                <Ionicons name="trending-up" size={14} color={seasonData.color} />
                <Text style={[styles.surgeText, { color: seasonData.color }]}>
                  +{seasonData.surge.percent}%{'\n'}demand
                </Text>
              </View>
            )}
          </View>
          <View style={styles.seasonTips}>
            {seasonData.tips.map((tip, i) => (
              <View key={i} style={styles.seasonTipRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#64748B" />
                <Text style={styles.seasonTip}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Seasonal Packages ── */}
        <View style={styles.sectionRow}>
          <Ionicons name={seasonData.icon as any} size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>{seasonData.season} Packages</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesRow} contentContainerStyle={styles.packagesContent}>
          {seasonData.packages.map((pkg, i) => (
            <Pressable
              key={i}
              style={[styles.packageCard, { backgroundColor: pkg.color }]}
              onPress={() => router.push({ pathname: '/tabs/explore', params: { skill: pkg.skill } })}
            >
              <View style={styles.packageIconBox}>
                <Ionicons name={pkg.icon as any} size={28} color="#fff" />
              </View>
              <Text style={styles.packageTitle}>{pkg.title}</Text>
              <Text style={styles.packageDesc}>{pkg.desc}</Text>
              <View style={styles.packagePriceRow}>
                <Text style={styles.packagePrice}>Rs. {pkg.price.toLocaleString()}</Text>
                <Text style={styles.packageOriginalPrice}>Rs. {pkg.originalPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.packageSavings}>
                <Ionicons name="pricetag-outline" size={9} color="#4ADE80" style={{ marginRight: 3 }} />
                <Text style={styles.packageSavingsText}>Save Rs. {(pkg.originalPrice - pkg.price).toLocaleString()}</Text>
              </View>
              <View style={styles.packageBtn}>
                <Text style={styles.packageBtnText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={12} color="#0F172A" style={{ marginLeft: 4 }} />
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionRow}>
          <Ionicons name="grid-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.title}
              style={[styles.actionCard, styles[action.style as keyof typeof styles] as any]}
              onPress={() => action.route ? router.push(action.route as any) : setChatOpen(true)}
            >
              <View style={styles.actionIconBox}>
                <Ionicons name={action.icon} size={24} color="#38BDF8" />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDesc}>{action.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Job Bidding — homeowner ── */}
        {user?.role !== 'technician' && (
          <View style={styles.biddingSection}>
            <View style={styles.sectionRow}>
              <Ionicons name="hammer-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Job Bidding</Text>
            </View>
            <Text style={styles.biddingSubtitle}>Post a job and let technicians compete for your work</Text>
            <View style={styles.biddingCards}>
              <Pressable style={styles.biddingCardPost} onPress={() => router.push('/tabs/job-post' as any)}>
                <View style={styles.biddingCardIconBox}>
                  <Ionicons name="create-outline" size={24} color="#38BDF8" />
                </View>
                <Text style={styles.biddingCardTitle}>Post a Job</Text>
                <Text style={styles.biddingCardDesc}>Get bids from verified technicians</Text>
                <Ionicons name="arrow-forward-outline" size={16} color="#38BDF8" style={{ marginTop: 8 }} />
              </Pressable>
              <Pressable style={styles.biddingCardMy} onPress={() => router.push('/tabs/my-job-posts' as any)}>
                <View style={[styles.biddingCardIconBox, { backgroundColor: '#052e16' }]}>
                  <Ionicons name="list-outline" size={24} color="#4ADE80" />
                </View>
                <Text style={styles.biddingCardTitle}>My Job Posts</Text>
                <Text style={styles.biddingCardDesc}>View bids received</Text>
                <Ionicons name="arrow-forward-outline" size={16} color="#4ADE80" style={{ marginTop: 8 }} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Available Jobs — technician ── */}
        {user?.role === 'technician' && (
          <View style={styles.biddingSection}>
            <View style={styles.sectionRow}>
              <Ionicons name="hammer-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Available Jobs</Text>
            </View>
            <Text style={styles.biddingSubtitle}>Browse jobs posted by homeowners and submit bids</Text>
            <Pressable style={styles.biddingCardFull} onPress={() => router.push('/tabs/available-jobs' as any)}>
              <View style={styles.biddingCardIconBox}>
                <Ionicons name="search-outline" size={24} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.biddingCardTitle}>Browse & Bid on Jobs</Text>
                <Text style={styles.biddingCardDesc}>Compete for jobs near you</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
            </Pressable>
          </View>
        )}

        {/* ── Our Services ── */}
        <View style={styles.sectionRow}>
          <Ionicons name="construct-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Our Services</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesRow}>
          {SERVICES.map((s) => (
            <Pressable
              key={s.skill}
              style={[styles.serviceCard, { backgroundColor: s.color }]}
              onPress={() => router.push({ pathname: '/tabs/explore', params: { skill: s.skill } })}
            >
              <View style={styles.serviceIconBox}>
                <Ionicons name={s.icon as any} size={28} color="#fff" />
              </View>
              <Text style={styles.serviceLabel}>{s.label}</Text>
              <Ionicons name="arrow-forward-circle-outline" size={18} color="#38BDF8" />
            </Pressable>
          ))}
        </ScrollView>

        {/* ── How It Works ── */}
        <View style={styles.sectionRow}>
          <Ionicons name="information-circle-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>How It Works</Text>
        </View>
        <View style={styles.stepsContainer}>
          {[
            { step: '1', title: 'Take a Photo',   desc: 'Snap a picture of the damaged area',      icon: 'camera-outline' as const,         color: '#1e3a5f' },
            { step: '2', title: 'AI Analysis',    desc: 'Our AI instantly identifies the problem', icon: 'hardware-chip-outline' as const,  color: '#052e16' },
            { step: '3', title: 'Book Expert',    desc: 'Choose from verified professionals',      icon: 'person-add-outline' as const,     color: '#2e1065' },
            { step: '4', title: 'Problem Solved', desc: 'Track progress and rate the service',     icon: 'checkmark-circle-outline' as const, color: '#1c1917' },
          ].map((item, index) => (
            <View key={item.step} style={styles.stepRow}>
              <View style={[styles.stepCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={22} color="#fff" />
                <Text style={styles.stepNum}>{item.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.desc}</Text>
              </View>
              {index < 3 && <View style={styles.stepConnector} />}
            </View>
          ))}
        </View>

        {/* ── Home Tips ── */}
        <View style={styles.sectionRow}>
          <Ionicons name="bulb-outline" size={18} color="#E5E7EB" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Home Maintenance Tips</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsRow}>
          {TIPS.map((tip) => (
            <View key={tip.title} style={styles.tipCard}>
              <View style={styles.tipIconBox}>
                <Ionicons name={tip.icon as any} size={24} color="#38BDF8" />
              </View>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.desc}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── CTA ── */}
        <View style={styles.ctaBanner}>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="construct" size={32} color="#38BDF8" />
          </View>
          <Text style={styles.ctaTitle}>Need Urgent Repair?</Text>
          <Text style={styles.ctaDesc}>Get a technician at your door within hours</Text>
          <Pressable style={styles.ctaBtn} onPress={() => router.push('/tabs/explore')}>
            <Text style={styles.ctaBtnText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={15} color="#0F172A" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>

      </ScrollView>

      {/* ── Floating FixBot Button ── */}
      <Pressable style={styles.floatingBot} onPress={() => setChatOpen(true)}>
        <Ionicons name="hardware-chip" size={28} color="#0F172A" />
      </Pressable>

      {/* ── FixBot Chat Modal ── */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatOverlay}>
            <View style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderLeft}>
                  <View style={styles.chatHeaderIconBox}>
                    <Ionicons name="hardware-chip" size={24} color="#38BDF8" />
                  </View>
                  <View>
                    <Text style={styles.chatHeaderTitle}>FixBot</Text>
                    <Text style={styles.chatHeaderSub}>AI Home Assistant</Text>
                  </View>
                </View>
                <Pressable onPress={() => setChatOpen(false)} style={styles.chatCloseBtn}>
                  <Ionicons name="close" size={18} color="#94A3B8" />
                </Pressable>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View>
                    <View style={[styles.msgRow, item.from === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
                      {item.from === 'bot' && (
                        <View style={styles.botAvatarBox}>
                          <Ionicons name="hardware-chip" size={16} color="#38BDF8" />
                        </View>
                      )}
                      <View style={[styles.msgBubble, item.from === 'user' ? styles.msgBubbleUser : styles.msgBubbleBot]}>
                        {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.imagePreview} resizeMode="cover" />}
                        <Text style={[styles.msgText, item.from === 'user' ? styles.msgTextUser : styles.msgTextBot]}>{item.text}</Text>
                      </View>
                    </View>
                    {item.skill && (
                      <Pressable style={styles.findExpertBtn} onPress={handleFindExpert}>
                        <Ionicons name="search-outline" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                        <Text style={styles.findExpertBtnText}>Find {item.skill} Now</Text>
                        <Ionicons name="arrow-forward" size={14} color="#38BDF8" style={{ marginLeft: 4 }} />
                      </Pressable>
                    )}
                  </View>
                )}
                ListFooterComponent={
                  typing || analyzingImage ? (
                    <View style={styles.msgRowBot}>
                      <View style={styles.botAvatarBox}>
                        <Ionicons name="hardware-chip" size={16} color="#38BDF8" />
                      </View>
                      <View style={styles.typingBubble}>
                        <ActivityIndicator size="small" color="#38BDF8" />
                        <Text style={styles.typingText}>{analyzingImage ? ' Analyzing your photo...' : ' Thinking...'}</Text>
                      </View>
                    </View>
                  ) : null
                }
              />

              <View style={styles.chatInputRow}>
                <Pressable style={styles.imageBtn} onPress={showImageOptions} disabled={analyzingImage || typing}>
                  <Ionicons name="camera-outline" size={22} color="#38BDF8" />
                </Pressable>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Describe your issue..."
                  placeholderTextColor="#64748B"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                />
                <Pressable
                  style={[styles.chatSendBtn, !input.trim() && styles.chatSendBtnDisabled]}
                  onPress={sendMessage}
                  disabled={!input.trim()}
                >
                  <Ionicons name="send" size={18} color={input.trim() ? '#0F172A' : '#475569'} />
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 60 },
  greeting: { color: '#94A3B8', fontSize: 14 },
  username: { color: '#E5E7EB', fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  rolePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  logoutBtn: { marginTop: 4 },
  headerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#38BDF8' },
  headerAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1E293B' },
  headerAvatarText: { color: '#0F172A', fontSize: 20, fontWeight: 'bold' },

  // Hero
  heroBanner: { margin: 16, backgroundColor: '#1E3A5F', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#38BDF820' },
  heroLeft: { flex: 1 },
  heroTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
  heroTag: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
  heroTitle: { color: '#E5E7EB', fontSize: 22, fontWeight: 'bold', lineHeight: 30, marginBottom: 8 },
  heroDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#38BDF8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  heroBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  heroIconBox: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginLeft: 10, backgroundColor: '#0F172A20', borderRadius: 20 },

  // FixBot Banner
  botBanner: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1E293B', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#38BDF840' },
  botIconBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  botBannerText: { flex: 1 },
  botBannerTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold' },
  botBannerDesc: { color: '#64748B', fontSize: 12, marginTop: 2 },
  botBannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#38BDF8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  botBannerBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },

  // Section titles
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold' },

  // Seasonal
  seasonBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 8 },
  seasonBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  seasonTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  seasonBannerTag: { fontSize: 13, fontWeight: 'bold' },
  seasonBannerTitle: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  surgeBadge: { borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 64, gap: 3 },
  surgeText: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', lineHeight: 16 },
  seasonTips: { gap: 6 },
  seasonTipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seasonTip: { color: '#64748B', fontSize: 12, lineHeight: 18, flex: 1 },

  // Packages
  packagesRow: { marginBottom: 8 },
  packagesContent: { paddingHorizontal: 16, gap: 12 },
  packageCard: { width: 200, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#ffffff10' },
  packageIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  packageTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  packageDesc: { color: '#94A3B8', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  packagePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  packagePrice: { color: '#4ADE80', fontSize: 16, fontWeight: 'bold' },
  packageOriginalPrice: { color: '#475569', fontSize: 12, textDecorationLine: 'line-through' },
  packageSavings: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#052e16', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  packageSavingsText: { color: '#4ADE80', fontSize: 10, fontWeight: 'bold' },
  packageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#38BDF8', padding: 10, borderRadius: 10 },
  packageBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 12 },

  // Quick Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  actionCard: { width: (width - 42) / 2, padding: 16, borderRadius: 16 },
  actionPrimary: { backgroundColor: '#1E3A5F' },
  actionSecondary: { backgroundColor: '#052e16' },
  actionTertiary: { backgroundColor: '#2e1065' },
  actionQuaternary: { backgroundColor: '#1c1917' },
  actionIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(56,189,248,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  actionDesc: { color: '#94A3B8', fontSize: 12 },

  // Services
  servicesRow: { paddingLeft: 16, marginBottom: 8 },
  serviceCard: { padding: 14, borderRadius: 16, alignItems: 'center', marginRight: 10, width: 100 },
  serviceIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceLabel: { color: '#E5E7EB', fontSize: 12, fontWeight: '600', marginBottom: 6 },

  // Steps
  stepsContainer: { marginHorizontal: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, position: 'relative' },
  stepCircle: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14, gap: 2 },
  stepNum: { color: '#38BDF8', fontSize: 9, fontWeight: 'bold' },
  stepContent: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 14 },
  stepTitle: { color: '#E5E7EB', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  stepDesc: { color: '#64748B', fontSize: 12 },
  stepConnector: { position: 'absolute', left: 27, bottom: -12, width: 2, height: 12, backgroundColor: '#334155' },

  // Tips
  tipsRow: { paddingLeft: 16, marginBottom: 8 },
  tipCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginRight: 12, width: 180 },
  tipIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tipTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tipDesc: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  // CTA
  ctaBanner: { margin: 16, backgroundColor: '#1E293B', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#38BDF820' },
  ctaIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  ctaTitle: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  ctaDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#38BDF8', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  ctaBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },

  // Floating
  floatingBot: { position: 'absolute', bottom: 90, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', elevation: 10 },

  // Bidding
  biddingSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  biddingSubtitle: { color: '#64748B', fontSize: 13, marginBottom: 12, marginTop: -4 },
  biddingCards: { flexDirection: 'row', gap: 10 },
  biddingCardPost: { flex: 1, backgroundColor: '#1E3A5F', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#38BDF820' },
  biddingCardMy: { flex: 1, backgroundColor: '#0a1f0f', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#4ADE8020' },
  biddingCardFull: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#38BDF820' },
  biddingCardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  biddingCardTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  biddingCardDesc: { color: '#64748B', fontSize: 12 },

  // Chat
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatHeaderIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  chatHeaderTitle: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold' },
  chatHeaderSub: { color: '#64748B', fontSize: 12 },
  chatCloseBtn: { backgroundColor: '#1E293B', padding: 8, borderRadius: 10 },
  messagesList: { padding: 16, paddingBottom: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  botAvatarBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  msgBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  msgBubbleUser: { backgroundColor: '#38BDF8', borderBottomRightRadius: 4 },
  msgBubbleBot: { backgroundColor: '#1E293B', borderBottomLeftRadius: 4 },
  imagePreview: { width: 180, height: 130, borderRadius: 10, marginBottom: 6 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#0F172A', fontWeight: '500' },
  msgTextBot: { color: '#E5E7EB' },
  typingBubble: { backgroundColor: '#1E293B', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  typingText: { color: '#64748B', fontSize: 13 },
  findExpertBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginBottom: 12, backgroundColor: '#1E3A5F', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#38BDF8' },
  findExpertBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 14 },
  chatInputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#1E293B', alignItems: 'flex-end' },
  imageBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#0F172A', color: '#E5E7EB', padding: 12, borderRadius: 20, fontSize: 15, maxHeight: 100 },
  chatSendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  chatSendBtnDisabled: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
});