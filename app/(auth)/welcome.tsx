import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '../../components/BrandLogo';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Grow Smarter\nwith AI',
    description: 'Detect diseases, improve yield, and manage crops effortlessly with cutting-edge AI.',
    badge: '🌾 Smart Farming',
    accent: '#00D26A',
    bgDark: '#071824',
    bgLight: '#ECFDF5',
  },
  {
    title: 'Instant Crop\nDiagnosis',
    description: 'Point your camera at any leaf and get AI-powered disease detection in seconds.',
    badge: '🔬 Disease Scanner',
    accent: '#3B82F6',
    bgDark: '#081724',
    bgLight: '#EFF6FF',
  },
  {
    title: 'Connect\n& Learn',
    description: 'Share experiences, ask questions, and learn from farmers worldwide.',
    badge: '👨‍🌾 Community',
    accent: '#8B5CF6',
    bgDark: '#0D091A',
    bgLight: '#F5F3FF',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDarkMode: isDark, theme } = useAppTheme();
  const { isAuthenticated, token } = useAuthStore();

  const scrollX = useSharedValue(0);
  const [current, setCurrent] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const buttonScale = useSharedValue(1);
  const screenOpacity = useSharedValue(0);

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const titleColor = theme.text;
  const descColor = theme.textLight;
  const brandColor = theme.text;
  const skipColor = theme.textLight;
  const loginColor = theme.textLight;
  const inactiveDot = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const containerBg = theme.background;

  useEffect(() => {
    const init = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('agrinex_onboarding_completed');
        if (onboardingCompleted === 'true') {
          if (isAuthenticated && token) {
            router.replace('/(tabs)');
            return;
          }
          router.replace('/(auth)/login');
          return;
        }

        if (isAuthenticated && token) {
          router.replace('/(tabs)');
          return;
        }
        const saved = await AsyncStorage.getItem('agrinex_remembered_creds');
        if (saved) {
          router.replace('/(auth)/login');
          return;
        }
      } catch (_) { }
      setIsReady(true);
      screenOpacity.value = withTiming(1, { duration: 400 });
    };
    init();
  }, [isAuthenticated, token]);

  const goToLogin = () => { router.replace('/(auth)/login'); };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('agrinex_onboarding_completed', 'true');
    } catch (_) {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    screenOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(goToLogin)();
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ x: next * width, y: 0, animated: true });
      }
      setCurrent(next);
    } else {
      handleFinish();
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x; },
  });

  const onMomentumScrollEnd = (e: any) => {
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  // ─── Pre-created Animated Styles to adhere to Rules of Hooks ─────────────────
  const bgStyles = SLIDES.map((_, i) => {
    return useAnimatedStyle(() => {
      const opacity = interpolate(
        scrollX.value,
        [(i - 1) * width, i * width, (i + 1) * width],
        [0, 1, 0],
        'clamp',
      );
      return { opacity };
    });
  });

  const contentStyles = SLIDES.map((_, i) => {
    return useAnimatedStyle(() => {
      const offset = i * width;
      const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
      const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [30, 0, -30], 'clamp');
      const scale = interpolate(scrollX.value, [offset - width, offset, offset + width], [0.92, 1, 0.92], 'clamp');
      return { opacity, transform: [{ translateY: ty }, { scale }] };
    });
  });

  const dotStyles = SLIDES.map((_, i) => {
    return useAnimatedStyle(() => {
      const targetPos = i * width;
      const input = [targetPos - width, targetPos, targetPos + width];
      const dotW = interpolate(scrollX.value, input, [8, 28, 8], 'clamp');
      const opacity = interpolate(scrollX.value, input, [0.3, 1.0, 0.3], 'clamp');
      return { width: dotW, opacity };
    });
  });

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  if (!isReady) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: containerBg }, screenStyle]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Gradient backgrounds per slide — no images */}
      {SLIDES.map((slide, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFill, bgStyles[i]]}>
          <LinearGradient
            colors={
              isDark
                ? [slide.bgDark, slide.accent + '55', '#000000']
                : [slide.bgLight, slide.accent + '33', '#ffffff']
            }
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.brandRow}>
          <BrandLogo size={26} animated={false} isDarkMode={isDark} />
          <Text style={[styles.brandName, { color: brandColor }]}>AgriNex</Text>
        </View>
        <Pressable onPress={handleFinish} hitSlop={16} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: skipColor }]}>Skip</Text>
        </Pressable>
      </SafeAreaView>

      {/* Slides */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: width * SLIDES.length }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <View style={styles.slideInner}>
              <Animated.View style={[styles.contentBlock, contentStyles[i]]}>

                {/* Large emoji icon */}
                <View style={[styles.iconCircle, { backgroundColor: slide.accent + '22', borderColor: slide.accent + '55' }]}>
                  <Text style={styles.iconEmoji}>{slide.badge.split(' ')[0]}</Text>
                </View>

                <View style={[styles.badge, {
                  borderColor: slide.accent + '60',
                  backgroundColor: slide.accent + '22',
                }]}>
                  <Text style={[styles.badgeText, { color: slide.accent }]}>{slide.badge}</Text>
                </View>

                <Text style={[styles.title, { color: titleColor }]}>{slide.title}</Text>
                <View style={[styles.accentLine, { backgroundColor: slide.accent }]} />
                <Text style={[styles.description, { color: descColor }]}>{slide.description}</Text>

              </Animated.View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        <View style={styles.indicatorRow}>
          {SLIDES.map((slide, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                dotStyles[i],
                { backgroundColor: current === i ? SLIDES[current].accent : inactiveDot },
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.btnWrapper, { transform: [{ scale: buttonScale }] }]}>
          <Pressable
            onPressIn={() => { buttonScale.value = withSpring(0.97); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            onPress={handleNext}
            style={styles.primaryBtn}
          >
            <LinearGradient
              colors={[SLIDES[current].accent, SLIDES[current].accent + 'BB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>
                {current === SLIDES.length - 1 ? '🌱  Get Started' : 'Next  →'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Pressable onPress={handleFinish}>
          <Text style={[styles.loginText, { color: loginColor }]}>
            Already have an account?{' '}
            <Text style={{ color: SLIDES[current].accent, fontWeight: '800' }}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, height },
  slideInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 150,
  },
  contentBlock: { width: '100%', alignItems: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingBottom: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  skipBtn: { paddingHorizontal: 4, paddingVertical: 8, backgroundColor: 'transparent' },
  skipText: { fontSize: 14, fontWeight: '600' },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconEmoji: { fontSize: 40 },
  badge: {
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 0,
  },
  accentLine: { width: 40, height: 3, borderRadius: 2, marginTop: 10, marginBottom: 10 },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 28,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 12,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { height: 8, borderRadius: 4 },
  btnWrapper: { width: '100%' },
  primaryBtn: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  primaryBtnGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  loginText: { fontSize: 13, fontWeight: '600' },
});
