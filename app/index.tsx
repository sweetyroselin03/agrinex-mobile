import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandLogo from '../components/BrandLogo';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../store/useAuthStore';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'agrinex_onboarding_completed';

export default function Index() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();
  const { checkAuth } = useAuthStore();

  // Animated values using standard React Native Animated API
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Run animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Start navigation timeout
    const timer = setTimeout(async () => {
      try {
        // Ensure auth check is completed
        await checkAuth();

        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (onboardingDone === 'true') {
          // Returning user: go to Home Screen if authenticated, otherwise to Welcome screen
          const isAuthed = useAuthStore.getState().isAuthenticated;
          if (isAuthed) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/welcome');
          }
        } else {
          // First-time user: go to Onboarding
          router.replace('/onboarding');
        }
      } catch (e) {
        console.error('[Splash] Navigation flow error:', e);
        router.replace('/onboarding');
      }
    }, 2800); // Duration: 2.8 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Decorative background blobs - theme aware */}
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blob1,
          { backgroundColor: isDarkMode ? 'rgba(0, 210, 106, 0.05)' : 'rgba(0, 210, 106, 0.03)' }
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blob2,
          { backgroundColor: isDarkMode ? 'rgba(34, 139, 230, 0.05)' : 'rgba(34, 139, 230, 0.03)' }
        ]}
      />

      <View style={styles.centerContent}>
        {/* Animated logo wrapper */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <BrandLogo size={120} animated={true} isDarkMode={isDarkMode} />
        </Animated.View>

        {/* Animated text blocks */}
        <Animated.View
          style={{
            opacity: contentFadeAnim,
            transform: [{ translateY: contentSlideAnim }],
            alignItems: 'center',
          }}
        >
          <Text style={[styles.title, { color: theme.text }]}>AgriNex AI</Text>
          <Text style={[styles.tagline, { color: theme.textLight }]}>
            Smart Farming Powered by AI
          </Text>
        </Animated.View>

        {/* Premium loader */}
        <Animated.View style={[styles.loaderWrapper, { opacity: contentFadeAnim }]}>
          <ActivityIndicator size="small" color="#00D26A" />
        </Animated.View>
      </View>

      {/* Version footer */}
      <Animated.View style={[styles.bottomContainer, { opacity: contentFadeAnim }]}>
        <Text style={[styles.versionText, { color: theme.textLight, opacity: 0.4 }]}>
          Version 1.0.0
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: '#00D26A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    opacity: 0.8,
  },
  loaderWrapper: {
    marginTop: 36,
    height: 30,
    justifyContent: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: height * 0.06,
    alignSelf: 'center',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: 300,
    height: 300,
    top: -60,
    left: -60,
  },
  blob2: {
    width: 250,
    height: 250,
    bottom: -50,
    right: -50,
  },
});
