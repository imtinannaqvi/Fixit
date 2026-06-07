import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, ScrollView
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { API_URL, BASE_URL } from '../../config';

export default function Chat() {
  const params = useLocalSearchParams();
  const bookingId = (Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId as string) || '';
  const technicianName = (Array.isArray(params.technicianName) ? params.technicianName[0] : params.technicianName as string) || 'Chat';

  const { token, user } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const quickReplies = [
    "I'm on my way 🚗",
    'Need more details 🔍',
    'Parts required 🔧',
    'Job completed ✅',
    'Will arrive in 10 mins ⏱️',
    'Please share location 📍',
  ];

  useEffect(() => {
    navigation.setOptions({ title: `💬 ${technicianName}` });
    if (!user?._id) return;
    setupSocket();
    fetchMessages();
    return () => {
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user?._id]);

  const setupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      console.log('✅ Socket connected:', socketRef.current.id);
      socketRef.current.emit('register', user._id.toString());
      socketRef.current.emit('joinRoom', bookingId.toString());
    });

    socketRef.current.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      socketRef.current.emit('register', user._id.toString());
      socketRef.current.emit('joinRoom', bookingId.toString());
    });

    socketRef.current.on('connect_error', (err: any) => {
      console.log('❌ Socket connect error:', err.message);
      setConnected(false);
    });

    socketRef.current.on('disconnect', (reason: string) => {
      setConnected(false);
      console.log('❌ Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        socketRef.current.connect();
      }
    });

    socketRef.current.on('newMessage', (msg: any) => {
      const normalized = {
        ...msg,
        _id: msg._id?.toString(),
        senderId: msg.senderId?.toString(),
        bookingId: msg.bookingId?.toString(),
      };
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => !m._optimistic);
        const alreadyExists = withoutOptimistic.find((m) => m._id === normalized._id);
        if (alreadyExists) return withoutOptimistic;
        return [...withoutOptimistic, normalized];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socketRef.current.on('userTyping', (data: any) => {
      if (data.senderId?.toString() !== user._id?.toString()) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2500);
      }
    });
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = res.data.map((m: any) => ({
        ...m,
        _id: m._id?.toString(),
        senderId: m.senderId?.toString(),
        bookingId: m.bookingId?.toString(),
      }));
      setMessages(normalized);
    } catch (err) {
      console.log('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  };

  const sendMessage = (msgText?: string) => {
    const trimmed = (msgText || text).trim();
    if (!trimmed) return;
    Keyboard.dismiss();

    const optimisticMsg = {
      _id: `optimistic_${Date.now()}`,
      _optimistic: true,
      bookingId: bookingId.toString(),
      senderId: user._id?.toString(),
      senderName: user.name,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    socketRef.current?.emit('sendMessage', {
      bookingId: bookingId.toString(),
      senderId: user._id?.toString(),
      senderName: user.name,
      text: trimmed,
    });
    setText('');
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', {
        bookingId: bookingId.toString(),
        senderId: user._id?.toString(),
      });
    }
  };

  const isMe = (msg: any) =>
    msg.senderId?.toString() === user._id?.toString();

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item, index }: any) => {
    const mine = isMe(item);
    const prevMsg = messages[index - 1];
    const showAvatar = !mine && (!prevMsg || isMe(prevMsg) || prevMsg.senderId !== item.senderId);
    const showName = !mine && showAvatar;

    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMe : styles.msgRowThem]}>
        {!mine && (
          <View style={styles.avatarCol}>
            {showAvatar ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.senderName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
        <View style={[styles.bubbleWrapper, mine ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
          {showName && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <View style={[
            styles.bubble,
            mine ? styles.bubbleMe : styles.bubbleThem,
            item._optimistic && styles.bubbleOptimistic,
          ]}>
            <Text style={[styles.msgText, mine ? styles.msgTextMe : styles.msgTextThem]}>
              {item.text}
            </Text>
            <View style={styles.msgMeta}>
              <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                {formatTime(item.createdAt)}
              </Text>
              {item._optimistic && (
                <Text style={styles.sendingDot}> ·</Text>
              )}
              {mine && !item._optimistic && (
                <Text style={styles.readTick}> ✓✓</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Connection status bar */}
      {!connected && !loading && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>🔴 Reconnecting...</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#38BDF8" size="large" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id?.toString() || index.toString()}
          // ✅ KEY FIX: flexGrow + justifyContent pushes messages to bottom like WhatsApp
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySub}>Start the conversation!</Text>
            </View>
          }
        />
      )}

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>typing</Text>
            <View style={styles.typingDots}>
              <Text style={styles.typingDot}>•</Text>
              <Text style={styles.typingDot}>•</Text>
              <Text style={styles.typingDot}>•</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Replies */}
      <View style={styles.quickRepliesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesContent}
        >
          {quickReplies.map((reply) => (
            <Pressable
              key={reply}
              style={styles.quickReplyBtn}
              onPress={() => sendMessage(reply)}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#64748B"
          value={text}
          onChangeText={handleTyping}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
          multiline
          maxLength={500}
          onFocus={() => {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
          }}
        />
        <Pressable
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!text.trim()}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  offlineBar: { backgroundColor: '#450a0a', paddingVertical: 6, alignItems: 'center' },
  offlineText: { color: '#f87171', fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },

  // ✅ THE FIX: flexGrow:1 + justifyContent:'flex-end' = messages always at bottom
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  avatarCol: { width: 36, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholder: { width: 30, height: 30 },
  avatarText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  bubbleWrapper: { maxWidth: '72%' },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  senderName: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#38BDF8', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1E293B', borderBottomLeftRadius: 4 },
  bubbleOptimistic: { opacity: 0.65 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTextMe: { color: '#0F172A', fontWeight: '500' },
  msgTextThem: { color: '#E5E7EB' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, gap: 2 },
  msgTime: { fontSize: 10, color: '#64748B' },
  msgTimeMine: { color: '#0c3547' },
  sendingDot: { fontSize: 10, color: '#0c3547' },
  readTick: { fontSize: 10, color: '#0c3547', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#E5E7EB', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#64748B', fontSize: 14 },
  typingContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderBottomLeftRadius: 4, gap: 4 },
  typingText: { color: '#64748B', fontSize: 12, fontStyle: 'italic' },
  typingDots: { flexDirection: 'row', gap: 2 },
  typingDot: { color: '#38BDF8', fontSize: 14, fontWeight: 'bold' },
  quickRepliesWrapper: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingVertical: 8 },
  quickRepliesContent: { paddingHorizontal: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  quickReplyBtn: { backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#38BDF8' },
  quickReplyText: { color: '#38BDF8', fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#1E293B', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#334155' },
  input: { flex: 1, backgroundColor: '#0F172A', color: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, fontSize: 15, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: '#334155' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#38BDF8', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  sendBtnText: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },
});