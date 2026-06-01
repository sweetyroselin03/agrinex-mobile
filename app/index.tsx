import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Temporarily add inside useEffect to reset:
await AsyncStorage.removeItem('agrinex_onboarding_completed');
await AsyncStorage.removeItem('agrinex_remembered_creds');
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
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '../components/BrandLogo';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const logoY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0);

  const navigateAway = () => {
    router.replace('/(auth)/welcome');
  };

  useEffect(() => {
    // Rings pulse in
    ring1Scale.value = withDelay(100, withSpring(1, { damping: 12 }));
    ring1Opacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    ring2Scale.value = withDelay(250, withSpring(1, { damping: 12 }));
    ring2Opacity.value = withDelay(250, withTiming(1, { duration: 600 }));

    // Logo springs in
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(300, withSpring(1, { damping: 14, stiffness: 120 }));
    logoY.value = withDelay(300, withSpring(0, { damping: 14 }));

    // Title slides up
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    titleY.value = withDelay(700, withSpring(0, { damping: 16 }));

    // Subtitle
    subtitleOpacity.value = withDelay(950, withTiming(1, { duration: 500 }));

    // Tagline
    taglineOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) }, () => {
        runOnJS(navigateAway)();
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={['#022C22', '#064E3B', '#065F46', '#059669']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative rings around logo */}
      <View style={styles.ringsContainer}>
        <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
        <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
      </View>

      {/* Glow blob */}
      <View style={styles.glowBlob} />

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.View style={[styles.logoWrapper, logoStyle]}>
          <BrandLogo size={110} animated={true} />
        </Animated.View>

        <Animated.View style={[styles.titleWrapper, titleStyle]}>
          <Text style={styles.title}>AgriNex</Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text style={styles.subtitle}>AI Powered Smart Farming</Text>
        </Animated.View>

        <Animated.View style={[styles.dividerRow, taglineStyle]}>
          <View style={styles.dividerLine} />
          <Text style={styles.tagline}>Grow Smarter. Farm Better.</Text>
          <View style={styles.dividerLine} />
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View style={[styles.bottomContainer, subtitleStyle]}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022C22' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  ringsContainer: {
    position: 'absolute',
    top: height * 0.5 - 160,
    left: width * 0.5 - 160,
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ring1: {
    width: 220,
    height: 220,
    borderColor: 'rgba(110, 231, 183, 0.2)',
  },
  ring2: {
    width: 300,
    height: 300,
    borderColor: 'rgba(110, 231, 183, 0.1)',
  },
  glowBlob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    top: height * 0.5 - 140,
    left: width * 0.5 - 140,
  },
  logoWrapper: {
    marginBottom: 24,
    shadowColor: '#6EE7B7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  titleWrapper: { marginBottom: 8 },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(167, 243, 208, 0.9)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    maxWidth: 50,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: height * 0.07,
    alignSelf: 'center',
  },
  versionText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
