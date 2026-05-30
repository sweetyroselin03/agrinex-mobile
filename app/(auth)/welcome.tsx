import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withTiming,
  withSpring,
  Easing as REasing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '../../components/BrandLogo';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Design system colors
const COLOR_PRIMARY = '#00D98B';
const COLOR_BG = '#000000';
const COLOR_WHITE = '#FFFFFF';
const COLOR_TEXT_BODY = 'rgba(255,255,255,0.9)';
const COLOR_TEXT_MUTED = 'rgba(255,255,255,0.55)';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();

  const scrollX = useSharedValue(0);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  // Animation values for interactive elements
  const buttonScale = useSharedValue(1);

  // Check Auto Login
  useEffect(() => {
    const checkAutoLogin = async () => {
      try {
        if (isAuthenticated && token) {
          router.replace('/(tabs)');
          return;
        }
        const saved = await AsyncStorage.getItem('agrinex_remembered_creds');
        if (saved) {
          router.replace('/(auth)/login');
          return;
        }
      } catch (_) {}
    };
    checkAutoLogin();
  }, [isAuthenticated, token]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = (e: any) => {
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (current < 2) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, y: 0, animated: true });
      setCurrent(next);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/login');
  };

  // Interpolations for cross-fading background images on scroll
  const bgStyle = (pageIndex: number) =>
    useAnimatedStyle(() => {
      const start = (pageIndex - 1) * width;
      const center = pageIndex * width;
      const end = (pageIndex + 1) * width;
      const opacity = interpolate(scrollX.value, [start, center, end], [0, 1, 0], 'clamp');
      const scale = interpolate(scrollX.value, [start, center, end], [1.08, 1.0, 1.08], 'clamp');
      const tx = interpolate(scrollX.value, [start, center, end], [width * 0.05, 0, -width * 0.05], 'clamp');
      return {
        opacity,
        transform: [{ scale }, { translateX: tx }],
      };
    });

  // Parallax text animation
  const contentStyle = (pageIndex: number) =>
    useAnimatedStyle(() => {
      const offset = pageIndex * width;
      const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
      const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [24, 0, -24], 'clamp');
      return {
        opacity,
        transform: [{ translateY: ty }],
      };
    });

  // Slide dot width/opacity mappings
  const getDotStyle = (index: number) =>
    useAnimatedStyle(() => {
      const targetPos = index * width;
      const input = [targetPos - width, targetPos, targetPos + width];
      const dotW = interpolate(scrollX.value, input, [8, 24, 8], 'clamp');
      const opacity = interpolate(scrollX.value, input, [0.3, 1.0, 0.3], 'clamp');
      return {
        width: dotW,
        opacity,
      };
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Background Cross-fading Images (25% dark overlay) ────────────────── */}

      {/* Screen 1 Background: Wheat Field */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle(0)]}>
        <Image
          source={require('../../assets/images/splash_wheat_field.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />
      </Animated.View>

      {/* Screen 2 Background: Leaf Scan */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle(1)]}>
        <Image
          source={require('../../assets/images/onboarding_scan.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />
      </Animated.View>

      {/* Screen 3 Background: Community/Analytics */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle(2)]}>
        <Image
          source={require('../../assets/images/onboarding_ai.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]} />
      </Animated.View>

      {/* ── Top Skip Button (Glassmorphism) ─────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.skipWrapper}>
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </SafeAreaView>

      {/* ── Onboarding Content Swiper ── */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: width * 3 }}
      >
        {/* Screen 1: Grow Smarter with AI */}
        <View style={styles.slide}>
          <SafeAreaView style={styles.slideSafe}>
            <Animated.View style={[styles.contentCard, contentStyle(0)]}>
              <BrandLogo size={64} animated={false} style={styles.logo} />
              <Text style={styles.title}>Grow Smarter{'\n'}with AI</Text>
              <Text style={styles.description}>
                Detect diseases, improve yield, and manage crops effortlessly.
              </Text>
            </Animated.View>
            <View style={styles.spacer} />
          </SafeAreaView>
        </View>

        {/* Screen 2: Instant Crop Diagnosis */}
        <View style={styles.slide}>
          <SafeAreaView style={styles.slideSafe}>
            <Animated.View style={[styles.contentCard, contentStyle(1)]}>
              <BrandLogo size={64} animated={false} style={styles.logo} />
              <Text style={styles.title}>Instant Crop{'\n'}Diagnosis</Text>
              <Text style={styles.description}>
                AI-powered disease detection in seconds.
              </Text>
            </Animated.View>
            <View style={styles.spacer} />
          </SafeAreaView>
        </View>

        {/* Screen 3: Connect & Learn */}
        <View style={styles.slide}>
          <SafeAreaView style={styles.slideSafe}>
            <Animated.View style={[styles.contentCard, contentStyle(2)]}>
              <BrandLogo size={64} animated={false} style={styles.logo} />
              <Text style={styles.title}>Connect & Learn</Text>
              <Text style={styles.description}>
                Share experiences and learn from farmers worldwide.
              </Text>
            </Animated.View>
            <View style={styles.spacer} />
          </SafeAreaView>
        </View>
      </Animated.ScrollView>

      {/* ── Bottom Glassmorphic Actions ── */}
      <View style={styles.bottomContainer}>
        {/* Pagination indicators */}
        <View style={styles.indicatorRow}>
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} style={[styles.dot, getDotStyle(i)]} />
          ))}
        </View>

        {/* Transparent glassmorphism CTA button */}
        <Animated.View style={{ width: '100%', transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPressIn={() => { buttonScale.value = withSpring(0.97); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            onPress={handleNext}
            style={styles.primaryGlassBtn}
          >
            <Text style={styles.primaryBtnText}>
              {current === 2 ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Account login fallback text */}
        <Pressable onPress={handleSkip} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  slide: {
    width,
    height,
  },
  slideSafe: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  contentCard: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    marginBottom: height * 0.03,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: COLOR_WHITE,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: COLOR_TEXT_BODY,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  spacer: {
    height: 180,
  },
  skipWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 10,
    right: 20,
    zIndex: 100,
  },
  skipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 32,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D98B',
  },
  primaryGlassBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryBtnText: {
    color: COLOR_WHITE,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 4,
  },
  loginLinkText: {
    color: COLOR_TEXT_MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
});
