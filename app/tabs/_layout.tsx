import { useState, useEffect, useCallback } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Text, View, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../../config';

// 👇 notification badge component
function NotifIcon({ color }: { color: string }) {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(res.data.count || 0);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchUnread();
    // poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, color }}>🔔</Text>
      {unread > 0 && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: -4,
          backgroundColor: '#f97316',
          borderRadius: 8,
          minWidth: 16,
          height: 16,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isTechnician = user?.role === 'technician';
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

 const homeownerTabs = [
  '/tabs/home',
  '/tabs/explore',
  '/tabs/diagnose',
  '/tabs/bookings',
  '/tabs/notifications',
  '/tabs/profile',
];

const technicianTabs = [
  '/tabs/home',
  '/tabs/technician-bookings',
  '/tabs/notifications',
  '/tabs/profile',
];
  const tabs = isTechnician ? technicianTabs : homeownerTabs;

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .runOnJS(true)
    .onEnd((event) => {
      const currentPath = '/' + segments.join('/');
      const currentIndex = tabs.findIndex(t =>
        currentPath.includes(t.split('/').pop()!)
      );
      if (event.translationX < -50 && event.velocityX < -100) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < tabs.length) router.push(tabs[nextIndex] as any);
      } else if (event.translationX > 50 && event.velocityX > 100) {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) router.push(tabs[prevIndex] as any);
      }
    });

  const tabBarHeight = 60 + (Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8));

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#1E293B',
              borderTopColor: '#334155',
              height: tabBarHeight,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8),
              paddingTop: 6,
            },
            tabBarActiveTintColor: '#38BDF8',
            tabBarInactiveTintColor: '#64748B',
          }}
        >
          <Tabs.Screen
            name="home/index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
              href: isTechnician ? null : '/tabs/explore',
            }}
          />
          <Tabs.Screen
            name="diagnose"
            options={{
              title: 'AI Diagnose',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤖</Text>,
              href: isTechnician ? null : '/tabs/diagnose',
            }}
          />
          <Tabs.Screen
            name="bookings"
            options={{
              title: 'Bookings',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
              href: isTechnician ? null : '/tabs/bookings',
            }}
          />
          <Tabs.Screen
            name="technician-bookings"
            options={{
              title: 'My Jobs',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
              href: isTechnician ? '/tabs/technician-bookings' : null,
            }}
          />

          {/* 👇 Notifications tab — shows for both roles */}
          <Tabs.Screen
            name="notifications"
            options={{
              title: 'Alerts',
              tabBarIcon: ({ color }) => <NotifIcon color={color} />,
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
            }}
          />
          <Tabs.Screen
            name="edit-profile"
            options={{
              title: 'Edit Profile',
              href: null,
            }}
          />
          {/* Homeowner tabs */}
<Tabs.Screen
  name="job-post"
  options={{ href: null }}
/>
<Tabs.Screen
  name="my-job-posts"
  options={{ href: null }}
/>
<Tabs.Screen
  name="available-jobs"
  options={{ href: null }}
/>
        </Tabs>
      </View>
    </GestureDetector>
  );
}