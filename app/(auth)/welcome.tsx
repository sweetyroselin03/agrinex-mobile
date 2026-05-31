import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  Image, StatusBar, Pressable, Platform,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Grow Smarter\nwith AI',
    description: 'Detect diseases, improve yield, and manage crops effortlessly with cutting-edge AI.',
    badge: '🌾 Smart Farming',
    image: require('../../assets/images/splash_wheat_field.png'),
    accent: '#00D98B',
  },
  {
    title: 'Instant Crop\nDiagnosis',
    description: 'Point your camera at any leaf and get AI-powered disease detection in seconds.',
    badge: '🔬 Disease Scanner',
    image: require('../../assets/images/onboarding_scan.png'),
    accent: '#38BDF8',
  },
  {
    title: 'Connect\n& Learn',
    description: 'Share experiences, ask questions, and learn from farmers worldwide.',
    badge: '👨‍🌾 Community',
    image: require('../../assets/images/onboarding_ai.png'),
    accent: '#A78BFA',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const scrollX = useSharedValue(0);
  const [current, setCurrent] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const buttonScale = useSharedValue(1);
  const screenOpacity = useSharedValue(0);

  useEffect(() => {
    const init = async () => {
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
      } catch (_) { }
      setIsReady(true);
      screenOpacity.value = withTiming(1, { duration: 400 });
    };
    init();
  }, [isAuthenticated, token]);

  const goToLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleFinish = () => {
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

  const bgStyle = (i: number) =>
    useAnimatedStyle(() => {
      const start = (i - 1) * width;
      const center = i * width;
      const end = (i + 1) * width;
      const opacity = interpolate(scrollX.value, [start, center, end], [0, 1, 0], 'clamp');
      const scale = interpolate(scrollX.value, [start, center, end], [1.08, 1.0, 1.08], 'clamp');
      return { opacity, transform: [{ scale }] };
    });

  const contentStyle = (i: number) =>
    useAnimatedStyle(() => {
      const offset = i * width;
      const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
      const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [30, 0, -30], 'clamp');
      const scale = interpolate(scrollX.value, [offset - width, offset, offset + width], [0.92, 1, 0.92], 'clamp');
      return { opacity, transform: [{ translateY: ty }, { scale }] };
    });

  const getDotStyle = (index: number) =>
    useAnimatedStyle(() => {
      const targetPos = index * width;
      const input = [targetPos - width, targetPos, targetPos + width];
      const dotW = interpolate(scrollX.value, input, [8, 28, 8], 'clamp');
      const opacity = interpolate(scrollX.value, input, [0.3, 1.0, 0.3], 'clamp');
      return { width: dotW, opacity };
    });

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  if (!isReady) return null;

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {SLIDES.map((slide, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFill, bgStyle(i)]}>
          <Image source={slide.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.93)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}

      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.brandRow}>
          <BrandLogo size={26} animated={false} />
          <Text style={styles.brandName}>AgriNex</Text>
        </View>
        <Pressable onPress={handleFinish} hitSlop={16} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </SafeAreaView>

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
              <Animated.View style={[styles.contentBlock, contentStyle(i)]}>
                <View style={[styles.badge, {
                  borderColor: slide.accent + '60',
                  backgroundColor: slide.accent + '22',
                }]}>
                  <Text style={[styles.badgeText, { color: slide.accent }]}>{slide.badge}</Text>
                </View>
                <Text style={styles.title}>{slide.title}</Text>
                <View style={[styles.accentLine, { backgroundColor: slide.accent }]} />
                <Text style={styles.description}>{slide.description}</Text>
              </Animated.View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.indicatorRow}>
          {SLIDES.map((slide, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                getDotStyle(i),
                { backgroundColor: current === i ? SLIDES[current].accent : 'rgba(255,255,255,0.3)' },
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
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={{ color: SLIDES[current].accent, fontWeight: '800' }}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height },
  slideInner: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 230,
  },
  contentBlock: { width: '100%' },
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
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 48,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  accentLine: {
    width: 44,
    height: 3,
    borderRadius: 2,
    marginTop: 14,
    marginBottom: 14,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 32,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 14,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { height: 8, borderRadius: 4 },
  btnWrapper: { width: '100%' },
  primaryBtn: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  primaryBtnGradient: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
});