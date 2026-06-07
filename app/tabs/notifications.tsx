import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config';

const NOTIFICATION_ICONS: any = {
  booking: '📋',
  payment: '💰',
  chat: '💬',
  verification: '🪪',
  price: '💵',
  completion: '🏠',
  general: '🔔',
};

const NOTIFICATION_COLORS: any = {
  booking: '#1e3a5f',
  payment: '#052e16',
  chat: '#1e3a5f',
  verification: '#052e16',
  price: '#1c1917',
  completion: '#052e16',
  general: '#1E293B',
};

export default function Notifications() {
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [token])
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.log('Notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.log('Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await axios.patch(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('Mark all read error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/notifications`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications([]);
          } catch (err) {
            console.log('Clear all error:', err);
          }
        }
      }
    ]);
  };

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification._id);
    if (notification.bookingId) {
      router.push('/tabs/bookings');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const topPadding = insets.top > 0 ? insets.top : 44;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔔 Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable style={styles.markAllBtn} onPress={markAllAsRead} disabled={markingAll}>
              <Text style={styles.markAllBtnText}>
                {markingAll ? '...' : '✓ All Read'}
              </Text>
            </Pressable>
          )}
          {notifications.length > 0 && (
            <Pressable style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearBtnText}>🗑️</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#38BDF8" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.notifCard,
                !item.isRead && styles.notifCardUnread,
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              {/* Unread dot */}
              {!item.isRead && <View style={styles.unreadDot} />}

              <View style={[styles.iconBox, { backgroundColor: NOTIFICATION_COLORS[item.type] || '#1E293B' }]}>
                <Text style={styles.icon}>{NOTIFICATION_ICONS[item.type] || '🔔'}</Text>
              </View>

              <View style={styles.notifContent}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                {item.bookingId && (
                  <Text style={styles.notifAction}>Tap to view booking →</Text>
                )}
              </View>

              <Pressable
                style={styles.deleteBtn}
                onPress={() => deleteNotification(item._id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySub}>You'll see booking updates and alerts here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#38BDF8' },
  unreadLabel: { color: '#f97316', fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  markAllBtn: { backgroundColor: '#052e16', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#4ADE80' },
  markAllBtnText: { color: '#4ADE80', fontSize: 12, fontWeight: 'bold' },
  clearBtn: { backgroundColor: '#450a0a', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#7f1d1d' },
  clearBtnText: { fontSize: 14 },

  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155', gap: 12, position: 'relative' },
  notifCardUnread: { borderColor: '#38BDF840', backgroundColor: '#1a2744' },
  unreadDot: { position: 'absolute', top: 14, left: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#38BDF8' },
  iconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  icon: { fontSize: 22 },
  notifContent: { flex: 1 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  notifTitleUnread: { color: '#E5E7EB' },
  notifTime: { color: '#475569', fontSize: 11 },
  notifBody: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  notifAction: { color: '#38BDF8', fontSize: 11, fontWeight: '600', marginTop: 4 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: '#475569', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
});