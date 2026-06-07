import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { LogBox, View, Text, StyleSheet, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'shadow* style props are deprecated',
  'props.pointerEvents is deprecated',
]);

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.7);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Text style={styles.splashIcon}>🔧</Text>
        <Text style={styles.splashTitle}>FixItNow</Text>
        <Text style={styles.splashTagline}>Your Home, Fixed Smart</Text>
        <View style={styles.splashDivider} />
        <Text style={styles.splashSub}>⚡ AI Powered Home Repairs</Text>
      </Animated.View>
    </View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <AuthProvider>
            <>
              <Stack
                initialRouteName="welcome"
                screenOptions={{
                  headerStyle: { backgroundColor: '#1E293B' },
                  headerTintColor: '#38BDF8',
                  headerTitleStyle: { fontWeight: 'bold', color: '#E5E7EB' },
                  headerBackTitle: 'Back',
                  contentStyle: { backgroundColor: '#0F172A' },
                }}
              >
                <Stack.Screen name="verify-email"     options={{ headerShown: false }} />
                <Stack.Screen name="forgot-password"  options={{ headerShown: false }} />
                <Stack.Screen name="reset-password"   options={{ headerShown: false }} />
                <Stack.Screen name="welcome"          options={{ headerShown: false }} />
                <Stack.Screen name="index"            options={{ headerShown: false }} />
                <Stack.Screen name="login"            options={{ headerShown: false }} />
                <Stack.Screen name="signup"           options={{ headerShown: false }} />
                <Stack.Screen name="tabs"             options={{ headerShown: false }} />
                <Stack.Screen name="technician/[id]"  options={{ title: 'Technician Detail' }} />
                <Stack.Screen name="chat/[bookingId]" options={{ headerShown: true, title: 'Chat', keyboardHandlingEnabled: true }} />
              </Stack>
              <StatusBar style="light" />
              <Toast />
            </>
          </AuthProvider>
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon:    { fontSize: 72, marginBottom: 16 },
  splashTitle:   { fontSize: 42, fontWeight: 'bold', color: '#38BDF8', letterSpacing: 2, marginBottom: 8 },
  splashTagline: { fontSize: 16, color: '#94A3B8', marginBottom: 24, letterSpacing: 1 },
  splashDivider: { width: 60, height: 3, backgroundColor: '#38BDF8', borderRadius: 2, marginBottom: 16 },
  splashSub:     { fontSize: 13, color: '#64748B', letterSpacing: 0.5 },
});