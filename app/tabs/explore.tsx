import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, Pressable, StyleSheet,
  TextInput, RefreshControl, Animated, Image, Platform
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL, BASE_URL } from '../../config';

const SKILLS = [
  { label: 'All', icon: 'apps-outline' as const },
  { label: 'Plumber', icon: 'water-outline' as const },
  { label: 'Electrician', icon: 'flash-outline' as const },
  { label: 'Carpenter', icon: 'hammer-outline' as const },
  { label: 'Painter', icon: 'color-palette-outline' as const },
  { label: 'AC Technician', icon: 'snow-outline' as const },
];

const SORT_OPTIONS = [
  { label: 'Nearest', value: 'distance', icon: 'location-outline' as const },
  { label: 'Top Rated', value: 'rating', icon: 'star-outline' as const },
  { label: 'Most Jobs', value: 'jobs', icon: 'checkmark-done-outline' as const },
  { label: 'Price ↑', value: 'price_asc', icon: 'trending-up-outline' as const },
  { label: 'Price ↓', value: 'price_desc', icon: 'trending-down-outline' as const },
];

const RADIUS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '20 km', value: 20 },
  { label: '50 km', value: 50 },
];

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
          <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
          <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '100%', height: 1, marginTop: 14 }]} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={[styles.skeletonLine, { flex: 1, height: 32, borderRadius: 8 }]} />
        <View style={[styles.skeletonLine, { flex: 1, height: 32, borderRadius: 8 }]} />
        <View style={[styles.skeletonLine, { flex: 1, height: 32, borderRadius: 8 }]} />
      </View>
    </Animated.View>
  );
}

export default function Explore() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState((params.skill as string) || 'All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showRadiusOptions, setShowRadiusOptions] = useState(false);

  useEffect(() => { getUserLocation(); }, []);
  useEffect(() => { if (params.skill) setSelectedSkill(params.skill as string); }, [params.skill]);

  useFocusEffect(
    useCallback(() => { fetchTechnicians(userLocation); }, [userLocation])
  );

  const getUserLocation = async () => {
    setLocationLoading(true);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setLocationName('Location permission denied');
        fetchTechnicians(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(async () => await Location.getLastKnownPositionAsync());
      if (!loc) { fetchTechnicians(null); return; }
      const { latitude, longitude } = loc.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) {
          const area = geo[0].district || geo[0].subregion || '';
          const city = geo[0].city || geo[0].region || '';
          setLocationName(area ? `${area}, ${city}` : city || 'Location found');
        }
      } catch { setLocationName('Location found'); }
      fetchTechnicians({ lat: latitude, lng: longitude });
    } catch {
      setLocationName('Location unavailable');
      fetchTechnicians(null);
    } finally { setLocationLoading(false); }
  };

  const fetchTechnicians = async (loc: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      const reqParams: any = {};
      if (loc) { reqParams.lat = loc.lat; reqParams.lng = loc.lng; }
      const res = await axios.get(`${API_URL}/technicians`, { params: reqParams });
      setTechnicians(res.data);
    } catch (err) { console.log('Error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchTechnicians(userLocation); };

  useEffect(() => {
    const q = search.toLowerCase().trim();
    let result = technicians.filter((t) => {
      const matchSkill = selectedSkill === 'All' || t.skill === selectedSkill;
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.skill.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
      const matchRadius = !radiusKm || !userLocation || t.distanceKm === undefined || t.distanceKm <= radiusKm;
      return matchSkill && matchSearch && matchRadius;
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'distance') return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'jobs') return b.jobsDone - a.jobsDone;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return 0;
    });
    setFiltered(result);
  }, [search, selectedSkill, technicians, sortBy, radiusKm]);

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

  const renderTechnician = ({ item, index }: any) => {
    const distColor = item.distanceKm !== undefined ? getDistanceColor(item.distanceKm) : null;
    const isNearest = index === 0 && userLocation && sortBy === 'distance';
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: '/technician/[id]', params: { id: item._id, distanceKm: item.distanceKm !== undefined ? String(item.distanceKm) : '' } })}
      >
        {isNearest && (
          <View style={styles.nearestBadge}>
            <Ionicons name="trophy" size={12} color="#FBBF24" />
            <Text style={styles.nearestBadgeText}>Nearest to You</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          {item.avatar ? (
            <Image source={{ uri: getAvatarUri(item.avatar) }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
                </View>
              )}
              <View style={item.available ? styles.availableBadge : styles.busyBadge}>
                <View style={[styles.statusDot, { backgroundColor: item.available ? '#4ADE80' : '#f87171' }]} />
                <Text style={[styles.availableText, { color: item.available ? '#4ADE80' : '#f87171' }]}>
                  {item.available ? 'Available' : 'Busy'}
                </Text>
              </View>
            </View>
            <View style={styles.skillRow}>
              <Ionicons name="construct-outline" size={12} color="#38BDF8" />
              <Text style={styles.skill}>{item.skill}</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#64748B" />
              <Text style={styles.location}>{item.location}</Text>
            </View>
            {item.distanceKm !== undefined && distColor && (
              <View style={[styles.distanceBadge, { backgroundColor: distColor.bg }]}>
                <Ionicons name="navigate-outline" size={10} color={distColor.text} />
                <Text style={[styles.distanceText, { color: distColor.text }]}>
                  {item.distanceKm} km · {distColor.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={styles.statValue}>{item.rating}</Text>
            <Text style={styles.statLabel}>{item.reviews} reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="checkmark-done" size={14} color="#4ADE80" />
            <Text style={styles.statValue}>{item.jobsDone}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="trophy-outline" size={14} color="#94A3B8" />
            <Text style={styles.statValue}>{item.experience}yr</Text>
            <Text style={styles.statLabel}>Exp</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>Rs. {item.price}</Text>
            <Text style={styles.priceLabel}>/hr</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const topPadding = insets.top > 0 ? insets.top : 44;
  const activeSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Nearest';

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Find Technicians</Text>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={14} color="#38BDF8" />
            <Text style={styles.locationHeaderText} numberOfLines={1}>
              {locationLoading ? 'Getting location...' : locationName || 'Enable location'}
            </Text>
            <Pressable onPress={getUserLocation} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={14} color="#64748B" />
            </Pressable>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.resultsCount}>{filtered.length} found</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, skill or area..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </Pressable>
        )}
      </View>

      {/* Skill Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {SKILLS.map((skill) => (
          <Pressable
            key={skill.label}
            onPress={() => { setSelectedSkill(skill.label); setSearch(''); }}
            style={selectedSkill === skill.label ? styles.filterBtnActive : styles.filterBtnInactive}
          >
            <Ionicons name={skill.icon} size={14} color={selectedSkill === skill.label ? '#0F172A' : '#94A3B8'} />
            <Text style={selectedSkill === skill.label ? styles.filterLabelActive : styles.filterLabelInactive}>
              {skill.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort + Radius */}
      <View style={styles.controlsRow}>
        <View style={styles.dropdownWrapper}>
          <Pressable
            style={[styles.controlBtn, sortBy !== 'distance' && styles.controlBtnActive]}
            onPress={() => { setShowSortOptions(!showSortOptions); setShowRadiusOptions(false); }}
          >
            <Ionicons name="funnel-outline" size={14} color={sortBy !== 'distance' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.controlBtnText, sortBy !== 'distance' && styles.controlBtnTextActive]}>
              {activeSortLabel}
            </Text>
            <Ionicons name={showSortOptions ? 'chevron-up' : 'chevron-down'} size={12} color="#64748B" />
          </Pressable>
          {showSortOptions && (
            <View style={styles.dropdown}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable key={opt.value} style={[styles.dropdownItem, sortBy === opt.value && styles.dropdownItemActive]}
                  onPress={() => { setSortBy(opt.value); setShowSortOptions(false); }}>
                  <Ionicons name={opt.icon} size={14} color={sortBy === opt.value ? '#38BDF8' : '#94A3B8'} />
                  <Text style={[styles.dropdownItemText, sortBy === opt.value && styles.dropdownItemTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dropdownWrapper}>
          <Pressable
            style={[styles.controlBtn, radiusKm && styles.controlBtnActive]}
            onPress={() => { setShowRadiusOptions(!showRadiusOptions); setShowSortOptions(false); }}
          >
            <Ionicons name="radio-button-on-outline" size={14} color={radiusKm ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.controlBtnText, radiusKm && styles.controlBtnTextActive]}>
              {radiusKm ? `${radiusKm} km` : 'Any radius'}
            </Text>
            <Ionicons name={showRadiusOptions ? 'chevron-up' : 'chevron-down'} size={12} color="#64748B" />
          </Pressable>
          {showRadiusOptions && (
            <View style={[styles.dropdown, styles.dropdownRight]}>
              {RADIUS_OPTIONS.map((opt) => (
                <Pressable key={String(opt.value)} style={[styles.dropdownItem, radiusKm === opt.value && styles.dropdownItemActive]}
                  onPress={() => { setRadiusKm(opt.value); setShowRadiusOptions(false); }}>
                  <Text style={[styles.dropdownItemText, radiusKm === opt.value && styles.dropdownItemTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={() => <SkeletonCard />}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderTechnician}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={['#38BDF8']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={48} color="#334155" />
              </View>
              <Text style={styles.emptyText}>No technicians found</Text>
              <Text style={styles.emptySub}>
                {radiusKm ? `No results within ${radiusKm}km` : search ? `No results for "${search}"` : 'Try a different skill'}
              </Text>
              {radiusKm && (
                <Pressable style={styles.clearRadiusBtn} onPress={() => setRadiusKm(null)}>
                  <Ionicons name="close-circle-outline" size={16} color="#38BDF8" />
                  <Text style={styles.clearRadiusBtnText}>Clear Radius</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingBottom: 10 },
  title: { color: '#E5E7EB', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationHeaderText: { color: '#94A3B8', fontSize: 12, flex: 1 },
  refreshBtn: { padding: 4, backgroundColor: '#1E293B', borderRadius: 6 },
  headerRight: { alignItems: 'flex-end', paddingTop: 4 },
  resultsCount: { color: '#64748B', fontSize: 12, backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E293B', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#E5E7EB', fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },
  filterScroll: { marginBottom: 10 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterBtnInactive: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  filterBtnActive: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#38BDF8' },
  filterLabelInactive: { color: '#94A3B8', fontWeight: '600', fontSize: 12 },
  filterLabelActive: { color: '#0F172A', fontWeight: 'bold', fontSize: 12 },
  controlsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8, zIndex: 10 },
  dropdownWrapper: { flex: 1, position: 'relative', zIndex: 10 },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between', backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  controlBtnActive: { borderColor: '#38BDF8', backgroundColor: '#1e3a5f' },
  controlBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', flex: 1 },
  controlBtnTextActive: { color: '#38BDF8' },
  dropdown: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', zIndex: 999, elevation: 10 },
  dropdownRight: { left: 0, right: 0 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#334155' },
  dropdownItemActive: { backgroundColor: '#1e3a5f' },
  dropdownItemText: { color: '#94A3B8', fontSize: 13 },
  dropdownItemTextActive: { color: '#38BDF8', fontWeight: 'bold' },

  // Skeleton
  skeletonCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 12 },
  skeletonHeader: { flexDirection: 'row', gap: 12 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#334155' },
  skeletonInfo: { flex: 1 },
  skeletonLine: { height: 12, backgroundColor: '#334155', borderRadius: 6, width: '80%' },

  // Card
  card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  nearestBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1c1917', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#FBBF2440' },
  nearestBadgeText: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 58, height: 58, borderRadius: 29, marginRight: 12, borderWidth: 2, borderColor: '#38BDF840' },
  avatarText: { color: '#0F172A', fontSize: 22, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { color: '#E5E7EB', fontSize: 15, fontWeight: 'bold', flex: 1 },
  verifiedBadge: { backgroundColor: '#1e3a5f', padding: 3, borderRadius: 6 },
  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#052e16', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  busyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#450a0a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  availableText: { fontSize: 10, fontWeight: 'bold' },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  skill: { color: '#38BDF8', fontSize: 12, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  location: { color: '#64748B', fontSize: 12 },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  distanceText: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: '#334155' },
  statValue: { color: '#E5E7EB', fontSize: 13, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 10 },
  priceBox: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#334155' },
  price: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  priceLabel: { color: '#64748B', fontSize: 9 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { color: '#E5E7EB', fontSize: 18, fontWeight: 'bold' },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  clearRadiusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: '#1e3a5f', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38BDF8' },
  clearRadiusBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },
});