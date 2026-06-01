import React, { useState, useRef } from 'react';
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
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanLine, Bot, Users, TrendingUp } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'agrinex_onboarding_completed';

const SLIDES = [
  {
    title: 'Scan Crops\nInstantly',
    description: 'Point your camera at any crop leaf and get AI-powered disease detection in seconds.',
    icon: ScanLine,
    gradient: ['#022C22', '#064E3B', '#065F46'] as const,
    iconColor: '#6EE7B7',
    accentColor: '#10B981',
    badge: '🌿 Disease Detection',
  },
  {
    title: 'AI Farming\nAssistant',
    description: 'Get expert advice on fertilizers, irrigation, pest control, and organic farming in your language.',
    icon: Bot,
    gradient: ['#0C1A3A', '#1E3A5F', '#1E40AF'] as const,
    iconColor: '#93C5FD',
    accentColor: '#3B82F6',
    badge: '🤖 Smart Chatbot',
  },
  {
    title: 'Farmer\nCommunity',
    description: 'Connect with farmers worldwide. Share experiences, ask questions, and learn together.',
    icon: Users,
    gradient: ['#2D1B69', '#5B21B6', '#6D28D9'] as const,
    iconColor: '#C4B5FD',
    accentColor: '#8B5CF6',
    badge: '👨‍🌾 Community',
  },
  {
    title: 'Market\nIntelligence',
    description: 'Track crop prices, weather forecasts, and get smart insights to maximize your yield and profit.',
    icon: TrendingUp,
    gradient: ['#451A03', '#92400E', '#B45309'] as const,
    iconColor: '#FCD34D',
    accentColor: '#F59E0B',
    badge: '📊 Market Insights',
  },
];

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
  activeColor: string;
}

function RedirectDot({ index, scrollX, activeColor }: DotProps) {
  const dotStyle = useAnimatedStyle(() => {
    const targetPos = index * width;
    const input = [targetPos - width, targetPos, targetPos + width];
    const dotW = interpolate(scrollX.value, input, [8, 28, 8], 'clamp');
    const opacity = interpolate(scrollX.value, input, [0.35, 1.0, 0.35], 'clamp');
    return { width: dotW, opacity };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        dotStyle,
        { backgroundColor: activeColor },
      ]}
    />
  );
}

interface SlideProps {
  index: number;
  scrollX: SharedValue<number>;
  slide: typeof SLIDES[0];
}

function RedirectSlide({ index, scrollX, slide }: SlideProps) {
  const IconComponent = slide.icon;

  const contentStyle = useAnimatedStyle(() => {
    const offset = index * width;
    const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
    const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [40, 0, -40], 'clamp');
    const scale = interpolate(scrollX.value, [offset - width, offset, offset + width], [0.88, 1, 0.88], 'clamp');
    return { opacity, transform: [{ translateY: ty }, { scale }] };
  });

  return (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        {/* Badge */}
        <Animated.View style={[styles.badgeContainer, contentStyle]}>
          <View style={[styles.badge, { borderColor: `${slide.accentColor}50`, backgroundColor: `${slide.accentColor}18` }]}>
            <Text style={[styles.badgeText, { color: slide.iconColor }]}>{slide.badge}</Text>
          </View>
        </Animated.View>

        {/* Icon */}
        <Animated.View style={[styles.iconContainer, contentStyle]}>
          <View style={[styles.iconOuterRing, { borderColor: `${slide.accentColor}30` }]}>
            <View style={[styles.iconCircle, { backgroundColor: `${slide.accentColor}18` }]}>
              <View style={[styles.iconInnerCircle, { backgroundColor: `${slide.accentColor}25` }]}>
                <IconComponent color={slide.iconColor} size={60} strokeWidth={1.5} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, contentStyle]}>
          <Text style={styles.title}>{slide.title}</Text>
          <View style={[styles.titleUnderline, { backgroundColor: slide.accentColor }]} />
          <Text style={styles.description}>{slide.description}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

interface BackgroundGradProps {
  index: number;
  scrollX: SharedValue<number>;
  gradient: typeof SLIDES[0]['gradient'];
}

function RedirectBgGrad({ index, scrollX, gradient }: BackgroundGradProps) {
  const bgStyle = useAnimatedStyle(() => {
    const center = index * width;
    const opacity = interpolate(scrollX.value, [center - width, center, center + width], [0, 1, 0], 'clamp');
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
      <LinearGradient
        colors={[...gradient, '#000000']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const buttonScale = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = (e: any) => {
    setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_) {}
    router.replace('/(auth)/welcome');
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, y: 0, animated: true });
      setCurrent(next);
    } else {
      completeOnboarding();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated background gradients */}
      {SLIDES.map((slide, i) => (
        <RedirectBgGrad key={i} index={i} scrollX={scrollX} gradient={slide.gradient} />
      ))}

      {/* Skip Button — transparent with border */}
      <SafeAreaView edges={['top']} style={styles.skipWrapper}>
        <Pressable onPress={completeOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </SafeAreaView>

      {/* AgriNex logo top left */}
      <SafeAreaView edges={['top']} style={styles.logoWrapper}>
        <Text style={styles.logoText}>AgriNex</Text>
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
          <RedirectSlide key={i} index={i} scrollX={scrollX} slide={slide} />
        ))}
      </Animated.ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {/* Dots */}
        <View style={styles.indicatorRow}>
          {SLIDES.map((slide, i) => (
            <RedirectDot
              key={i}
              index={i}
              scrollX={scrollX}
              activeColor={current === i ? SLIDES[current].accentColor : 'rgba(255,255,255,0.3)'}
            />
          ))}
        </View>

        {/* Next / Get Started */}
        <Animated.View style={{ width: '100%', transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPressIn={() => { buttonScale.value = withSpring(0.96); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            onPress={handleNext}
            style={styles.primaryBtn}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>
                {current === SLIDES.length - 1 ? '🌱 Get Started' : 'Next →'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Text style={styles.pageText}>{current + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height },
  slideInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  logoWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 10,
    left: 24,
    zIndex: 100,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    opacity: 0.9,
  },
  skipWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 10,
    right: 20,
    zIndex: 100,
  },
  skipBtn: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeContainer: { marginBottom: 24 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconContainer: { marginBottom: 40 },
  iconOuterRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: { alignItems: 'center', width: '100%' },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  titleUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 36,
    left: 28,
    right: 28,
    alignItems: 'center',
    gap: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryBtnGradient: {
    height: 58,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pageText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '600',
  },
});