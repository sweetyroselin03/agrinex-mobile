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
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../store/useAuthStore';

const { height } = Dimensions.get('window');
const ONBOARDING_KEY = 'agrinex_onboarding_completed';

export default function Index() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();
  const { checkAuth } = useAuthStore();

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const loaderFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered fade-in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(loaderFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigation after splash
    const timer = setTimeout(async () => {
      try {
        await checkAuth();
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (onboardingDone === 'true') {
          const isAuthed = useAuthStore.getState().isAuthenticated;
          if (isAuthed) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/welcome');
          }
        } else {
          router.replace('/onboarding');
        }
      } catch (e) {
        console.error('[Splash] Navigation flow error:', e);
        router.replace('/onboarding');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const BG = isDarkMode ? '#06131D' : '#F8FAF9';
  const ACCENT = '#22E58B';

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      <View style={styles.centerContent}>
        {/* App name — large, bold, clean */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
          }}
        >
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#0D1B2A' }]}>
            AgriNex
          </Text>
          <Text style={[styles.titleAccent, { color: ACCENT }]}>
            AI
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: subtitleFade, marginTop: 12 }}>
          <Text style={[styles.tagline, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(13,27,42,0.45)' }]}>
            Smart Farming Powered by AI
          </Text>
        </Animated.View>

        {/* Loader */}
        <Animated.View style={[styles.loaderWrapper, { opacity: loaderFade }]}>
          <ActivityIndicator size="small" color={ACCENT} />
        </Animated.View>
      </View>

      {/* Version footer */}
      <Animated.View style={[styles.bottomContainer, { opacity: subtitleFade }]}>
        <Text style={[styles.versionText, { color: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(13,27,42,0.25)' }]}>
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
  title: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textAlign: 'center',
  },
  loaderWrapper: {
    marginTop: 40,
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
});
