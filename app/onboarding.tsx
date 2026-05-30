import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
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
    gradient: ['#064E3B', '#065F46'] as const,
    iconColor: '#6EE7B7',
  },
  {
    title: 'AI Farming\nAssistant',
    description: 'Get expert advice on fertilizers, irrigation, pest control, and organic farming in your language.',
    icon: Bot,
    gradient: ['#1E3A5F', '#1E40AF'] as const,
    iconColor: '#93C5FD',
  },
  {
    title: 'Community\nSupport',
    description: 'Connect with farmers worldwide. Share experiences, ask questions, and learn together.',
    icon: Users,
    gradient: ['#5B21B6', '#6D28D9'] as const,
    iconColor: '#C4B5FD',
  },
  {
    title: 'Market\nIntelligence',
    description: 'Track crop prices, weather forecasts, and get smart insights to maximize your yield and profit.',
    icon: TrendingUp,
    gradient: ['#92400E', '#B45309'] as const,
    iconColor: '#FCD34D',
  },
];

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

  const handleSkip = () => {
    completeOnboarding();
  };

  const getDotStyle = (index: number) =>
    useAnimatedStyle(() => {
      const targetPos = index * width;
      const input = [targetPos - width, targetPos, targetPos + width];
      const dotW = interpolate(scrollX.value, input, [8, 28, 8], 'clamp');
      const opacity = interpolate(scrollX.value, input, [0.3, 1.0, 0.3], 'clamp');
      return { width: dotW, opacity };
    });

  const getContentStyle = (pageIndex: number) =>
    useAnimatedStyle(() => {
      const offset = pageIndex * width;
      const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
      const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [30, 0, -30], 'clamp');
      return { opacity, transform: [{ translateY: ty }] };
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradients for each slide */}
      {SLIDES.map((slide, i) => {
        const bgStyle = useAnimatedStyle(() => {
          const center = i * width;
          const opacity = interpolate(scrollX.value, [center - width, center, center + width], [0, 1, 0], 'clamp');
          return { opacity };
        });
        return (
          <Animated.View key={i} style={[StyleSheet.absoluteFill, bgStyle]}>
            <LinearGradient colors={[...slide.gradient, '#000000']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        );
      })}

      {/* Skip Button */}
      <SafeAreaView edges={['top']} style={styles.skipWrapper}>
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
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
        {SLIDES.map((slide, i) => {
          const IconComponent = slide.icon;
          return (
            <View key={i} style={styles.slide}>
              <View style={styles.slideInner}>
                {/* Icon */}
                <Animated.View style={[styles.iconContainer, getContentStyle(i)]}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <View style={[styles.iconInnerCircle, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                      <IconComponent color={slide.iconColor} size={56} strokeWidth={1.8} />
                    </View>
                  </View>
                </Animated.View>

                {/* Text */}
                <Animated.View style={[styles.textContainer, getContentStyle(i)]}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </Animated.View>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {/* Progress Dots */}
        <View style={styles.indicatorRow}>
          {SLIDES.map((_, i) => (
            <Animated.View key={i} style={[styles.dot, getDotStyle(i)]} />
          ))}
        </View>

        {/* Next / Get Started Button */}
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
                {current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Page indicator text */}
        <Text style={styles.pageText}>{current + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width,
    height,
  },
  slideInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 48,
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
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnGradient: {
    height: 56,
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
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
});
