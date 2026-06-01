import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useThemeStore } from '../store/useThemeStore';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../store/useAuthStore';
import Colors from '../constants/Colors';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import BrandLogo from '../components/BrandLogo';
import ErrorBoundary from '../components/ErrorBoundary';

const queryClient = new QueryClient();

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const { isDarkMode } = useAppTheme();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const prepare = async () => {
      // Check onboarding status
      try {
        const onboardingDone = await AsyncStorage.getItem('agrinex_onboarding_completed');
        setHasSeenOnboarding(onboardingDone === 'true');
      } catch (_) {}

      // Add 10-second max timeout to handle Render cold starts gracefully
      const authTimeout = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log('[Layout] Auth check timed out after 10s — continuing');
          resolve();
        }, 10000);
      });

      const authCheck = (async () => {
        try {
          await checkAuth();
        } catch (e) {
          console.log('[Layout] Auth check failed:', e);
        }
      })();

      await Promise.race([authCheck, authTimeout]);
      setIsReady(true);
    };
    prepare();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Bypass navigation guards for splash / index route to let animation complete
    const initialSegment = segments[0] as string | undefined;
    if (!initialSegment || initialSegment === 'splash') {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup && segments[0] !== 'onboarding' && segments[0] !== 'redirect') {
      // Route to onboarding first if not seen, otherwise to welcome
      if (!hasSeenOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/(auth)/welcome');
      }
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated and trying to access auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isReady, hasSeenOnboarding]);

  // Sync navigation theme with our store
  const navigationTheme = DarkTheme;
  
  // Custom theme adjustments to match our branding
  const customTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: '#22E58B',
      background: '#06131D',
      card: '#102235',
      text: '#FFFFFF',
      border: 'rgba(34,229,139,0.25)',
    }
  };

  if (!isReady) {
    return <SplashScreen isDarkMode={isDarkMode} bgColor={customTheme.colors.background} textColor={customTheme.colors.text} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={customTheme}>
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: customTheme.colors.background },
            }}
          >
            <Stack.Screen name="splash" />
            <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right', animationDuration: 500 }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="messages" options={{ presentation: 'card' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </GestureHandlerRootView>
      </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// ─── Premium Reanimated Splash Screen ────────────────────────────────────────
function SplashScreen({ isDarkMode, bgColor, textColor }: { isDarkMode: boolean; bgColor: string; textColor: string }) {
  const containerOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const blobScale = useSharedValue(0.8);

  useEffect(() => {
    // Container fade
    containerOpacity.value = withTiming(1, { duration: 600 });
    // Logo entrance
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 700 }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 700 }));
    // Subtitle stagger
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    // Blob breathe
    blobScale.value = withDelay(400, withRepeat(withSequence(
      withTiming(1.15, { duration: 3000 }),
      withTiming(0.9, { duration: 3000 })
    ), -1, true));
    // Subtle logo breathing after entrance
    setTimeout(() => {
      logoScale.value = withRepeat(withSequence(
        withTiming(1.03, { duration: 2800 }),
        withTiming(0.98, { duration: 2800 })
      ), -1, true);
    }, 900);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const blob1Style = useAnimatedStyle(() => ({ transform: [{ scale: blobScale.value }], opacity: 0.10 }));
  const blob2Style = useAnimatedStyle(() => ({ transform: [{ scale: blobScale.value * 0.95 }], opacity: 0.07 }));

  return (
    <Animated.View style={[splashStyles.container, { backgroundColor: bgColor }, containerStyle]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {/* Background blobs */}
      <Animated.View pointerEvents="none" style={[splashStyles.blob, splashStyles.blob1, blob1Style, { backgroundColor: '#10B981' }]} />
      <Animated.View pointerEvents="none" style={[splashStyles.blob, splashStyles.blob2, blob2Style, { backgroundColor: '#34D399' }]} />
      <Animated.View style={[splashStyles.logoWrapper, logoStyle]}>
        <BrandLogo size={84} animated={true} isDarkMode={isDarkMode} />
      </Animated.View>
      <Animated.View style={[splashStyles.textBlock, logoStyle]}>
        <Text style={[splashStyles.title, { color: textColor }]}>AgriNex</Text>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text style={[splashStyles.subtitle, { color: isDarkMode ? '#6EE7B7' : '#059669' }]}>
          Smart Farming. Better Future.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 42,
  },
  textBlock: {
    marginTop: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: 260,
    height: 260,
    top: -80,
    left: -90,
  },
  blob2: {
    width: 220,
    height: 220,
    bottom: -60,
    right: -70,
  },
});
