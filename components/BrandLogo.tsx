import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export default function BrandLogo({ size = 84, animated = false, style }: BrandLogoProps) {
  // Pulse animations
  const pulseScale1 = useSharedValue(1);
  const pulseOpacity1 = useSharedValue(0.45);
  const pulseScale2 = useSharedValue(1);
  const pulseOpacity2 = useSharedValue(0.6);

  // Breathing and Floating animations
  const breathingScale = useSharedValue(1);
  const breathingFloat = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Outer Pulse Ring (Slower, Larger)
      pulseScale1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.45, { duration: 3200, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0, { duration: 3200, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );

      // Inner Pulse Ring (Faster, Smaller)
      pulseScale2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.25, { duration: 2000, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );

      // Breathing Scale Animation
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Floating Vertical Motion
      breathingFloat.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 2600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale1.value = 1;
      pulseOpacity1.value = 0;
      pulseScale2.value = 1;
      pulseOpacity2.value = 0;
      breathingScale.value = 1;
      breathingFloat.value = 0;
    }
  }, [animated]);

  // Animated Styles
  const pulseRingStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: pulseOpacity1.value,
  }));

  const pulseRingStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: pulseOpacity2.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathingScale.value },
      { translateY: breathingFloat.value },
    ],
  }));

  // Sizing calculations
  const totalContainerSize = size + 28;
  const iconSize = size * 0.72; // Make the leaf icon relatively larger since the circle container is gone

  const logoCircleStyle = {
    width: size,
    height: size,
  };

  const pulseRingOuterStyle1 = {
    position: 'absolute' as const,
    width: size + 28,
    height: size + 28,
    borderRadius: (size + 28) / 2,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 217, 139, 0.35)', // Glowing neon green pulse
  };

  const pulseRingOuterStyle2 = {
    position: 'absolute' as const,
    width: size + 12,
    height: size + 12,
    borderRadius: (size + 12) / 2,
    borderWidth: 1.8,
    borderColor: 'rgba(0, 217, 139, 0.6)',
  };

  return (
    <View style={[styles.logoContainer, { width: totalContainerSize, height: totalContainerSize }, style]}>
      {animated && (
        <>
          {/* Ambient Glow Diffusion Background */}
          <View style={[styles.glowDiffusion, { width: size * 1.5, height: size * 1.5, borderRadius: size }]} />
          
          {/* Concentric Glow Pulse Rings */}
          <Animated.View style={[pulseRingOuterStyle1, pulseRingStyle1]} />
          <Animated.View style={[pulseRingOuterStyle2, pulseRingStyle2]} />
        </>
      )}

      {/* Main Transparent Logo Container */}
      <Animated.View style={[styles.logoCircle, logoCircleStyle, animated ? animatedContainerStyle : null]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00D98B" />
              <Stop offset="100%" stopColor="#00C27A" />
            </LinearGradient>
            <LinearGradient id="circuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#00D98B" />
              <Stop offset="100%" stopColor="#00FF9D" />
            </LinearGradient>
          </Defs>

          {/* Central Spine / Tech Backbone */}
          <Line
            x1="50"
            y1="22"
            x2="50"
            y2="78"
            stroke="#00D98B"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity={0.8}
          />

          {/* Left Half: Pure Organic Curved Leaf */}
          <Path
            d="M50 22 C24 22 20 54 50 78 Z"
            fill="url(#emeraldGrad)"
          />

          {/* Right Half: High-Tech Digital Circuit Outline */}
          <Path
            d="M50 22 C68 28 76 48 68 62 L50 78"
            fill="none"
            stroke="url(#circuitGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Upper Circuit Node Branch */}
          <Path
            d="M50 38 L65 38 L71 45"
            fill="none"
            stroke="#00FF9D"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="71" cy="45" r="3.5" fill="#FFFFFF" stroke="#00C27A" strokeWidth="1.8" />

          {/* Lower Circuit Node Branch */}
          <Path
            d="M50 58 L61 58 L67 65"
            fill="none"
            stroke="#00FF9D"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="67" cy="65" r="3.5" fill="#FFFFFF" stroke="#00C27A" strokeWidth="1.8" />

          {/* Central Energy Core Node */}
          <Circle cx="50" cy="50" r="4.5" fill="#FFFFFF" stroke="#00D98B" strokeWidth="2.2" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Fully transparent container
  },
  glowDiffusion: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 217, 139, 0.12)', // Subtle neon green light diffusion
    filter: 'blur(20px)' as any,
  },
});
