import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '../components/BrandLogo';

const { width, height } = Dimensions.get('window');

export default function Splash() {
  const router = useRouter();

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  const navigateAway = () => {
    router.replace('/(auth)/welcome');
  };

  useEffect(() => {
    // Fade and scale logo in
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));

    // Fade tagline in
    contentOpacity.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));

    // After 2.5s total, fade out and navigate
    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(navigateAway)();
      });
    }, 2100); // 2100 + 400 fade = 2500ms total

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dark Green Gradient Background */}
      <LinearGradient
        colors={['#064E3B', '#065F46', '#047857', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.View style={logoStyle}>
          <BrandLogo size={110} animated={true} />
        </Animated.View>

        <Animated.View style={[styles.textWrapper, contentStyle]}>
          <Text style={styles.title}>AgriNex</Text>
          <Text style={styles.subtitle}>AI Powered Smart Farming</Text>
        </Animated.View>
      </View>

      {/* Bottom Version */}
      <Animated.View style={[styles.bottomContainer, contentStyle]}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: height * 0.08,
    alignSelf: 'center',
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: -80,
    left: -60,
  },
});
