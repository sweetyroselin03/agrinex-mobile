import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
}

export default function BrandLogo({ size = 84, animated = false, style }: BrandLogoProps) {
  const pulseScale1 = useSharedValue(1);
  const pulseOpacity1 = useSharedValue(0.45);
  const pulseScale2 = useSharedValue(1);
  const pulseOpacity2 = useSharedValue(0.6);
  const breathingScale = useSharedValue(1);
  const breathingFloat = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      pulseScale1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.45, { duration: 3200, easing: Easing.out(Easing.ease) })
        ), -1, false
      );
      pulseOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0, { duration: 3200, easing: Easing.out(Easing.ease) })
        ), -1, false
      );
      pulseScale2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.25, { duration: 2000, easing: Easing.out(Easing.ease) })
        ), -1, false
      );
      pulseOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) })
        ), -1, false
      );
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
      breathingFloat.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 2600, easing: Easing.inOut(Easing.ease) })
        ), -1, true
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

  const totalContainerSize = size + 28;

  const pulseRingOuterStyle1 = {
    position: 'absolute' as const,
    width: size + 28,
    height: size + 28,
    borderRadius: (size + 28) / 2,
    borderWidth: 1.2,
    borderColor: 'rgba(16,185,129,0.35)',
  };

  const pulseRingOuterStyle2 = {
    position: 'absolute' as const,
    width: size + 12,
    height: size + 12,
    borderRadius: (size + 12) / 2,
    borderWidth: 1.8,
    borderColor: 'rgba(16,185,129,0.6)',
  };

  return (
    <View
      style={[
        styles.logoContainer,
        { width: totalContainerSize, height: totalContainerSize },
        style,
      ]}
    >
      {animated && (
        <>
          <View
            style={[
              styles.glowDiffusion,
              { width: size * 1.5, height: size * 1.5, borderRadius: size },
            ]}
          />
          <Animated.View style={[pulseRingOuterStyle1, pulseRingStyle1]} />
          <Animated.View style={[pulseRingOuterStyle2, pulseRingStyle2]} />
        </>
      )}

      <Animated.View
        style={[
          { width: size, height: size },
          animated ? animatedContainerStyle : null,
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: size, height: size, resizeMode: 'contain' }}
        />
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
  glowDiffusion: {
    position: 'absolute',
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
});
