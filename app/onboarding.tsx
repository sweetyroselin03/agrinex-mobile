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
    gradient: ['#0A251C', '#041B13'] as const,
    iconColor: '#00D26A',
  },
  {
    title: 'AI Farming\nAssistant',
    description: 'Get expert advice on fertilizers, irrigation, pest control, and organic farming in your language.',
    icon: Bot,
    gradient: ['#0F2130', '#081724'] as const,
    iconColor: '#3B82F6',
  },
  {
    title: 'Community\nSupport',
    description: 'Connect with farmers worldwide. Share experiences, ask questions, and learn together.',
    icon: Users,
    gradient: ['#23143A', '#130A24'] as const,
    iconColor: '#8B5CF6',
  },
  {
    title: 'Market\nIntelligence',
    description: 'Track crop prices, weather forecasts, and get smart insights to maximize your yield and profit.',
    icon: TrendingUp,
    gradient: ['#301B0B', '#1B0E05'] as const,
    iconColor: '#F59E0B',
  },
];

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
}

function OnboardingDot({ index, scrollX }: DotProps) {
  const dotStyle = useAnimatedStyle(() => {
    const targetPos = index * width;
    const input = [targetPos - width, targetPos, targetPos + width];
    const dotW = interpolate(scrollX.value, input, [8, 24, 8], 'clamp');
    const opacity = interpolate(scrollX.value, input, [0.3, 1.0, 0.3], 'clamp');
    return { width: dotW, opacity };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

interface SlideProps {
  index: number;
  scrollX: SharedValue<number>;
  slide: typeof SLIDES[0];
}

function OnboardingSlide({ index, scrollX, slide }: SlideProps) {
  const IconComponent = slide.icon;

  const contentStyle = useAnimatedStyle(() => {
    const offset = index * width;
    const opacity = interpolate(scrollX.value, [offset - width, offset, offset + width], [0, 1, 0], 'clamp');
    const ty = interpolate(scrollX.value, [offset - width, offset, offset + width], [20, 0, -20], 'clamp');
    return { opacity, transform: [{ translateY: ty }] };
  });

  return (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        {/* Icon */}
        <Animated.View style={[styles.iconContainer, contentStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 }]}>
            <View style={[styles.iconInnerCircle, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <IconComponent color={slide.iconColor} size={44} strokeWidth={1.8} />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textContainer, contentStyle]}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </Animated.View>
      </View>
    </View>
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

  const handleSkip = () => {
    completeOnboarding();
  };

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
            <LinearGradient colors={[...slide.gradient, '#071824']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
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
        {SLIDES.map((slide, i) => (
          <OnboardingSlide key={i} index={i} scrollX={scrollX} slide={slide} />
        ))}
      </Animated.ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {/* Progress Dots */}
        <View style={styles.indicatorRow}>
          {SLIDES.map((_, i) => (
            <OnboardingDot key={i} index={i} scrollX={scrollX} />
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
              colors={['#00D26A', '#00B85C']}
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
    backgroundColor: '#071824',
  },
  slide: {
    width,
    height,
  },
  slideInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  skipWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 10,
    right: 20,
    zIndex: 100,
  },
  skipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D26A',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    height: 54,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pageText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
});
