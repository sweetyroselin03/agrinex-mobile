import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
  /** Pass isDarkMode so the logo container adapts to the current theme */
  isDarkMode?: boolean;
  /** Show the text name beside or below the icon */
  showName?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
}

/** Pure SVG leaf icon — no image file dependency */
function LeafIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8.17 20C12.87 20 16.46 15.94 17.73 12.42C19 8.9 19 4 19 4C15.18 4 12.42 5.07 10.6 6.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color + '30'}
      />
      <Path
        d="M8 16C9.5 13 12 10 17 8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function BrandLogo({
  size = 84,
  animated = false,
  style,
  isDarkMode = true,
  showName = false,
  layout = 'vertical',
}: BrandLogoProps) {
  const breathingScale = useSharedValue(1);
  const breathingFloat = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (animated) {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      breathingFloat.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 2600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.35, { duration: 2800, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 2800, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      breathingScale.value = 1;
      breathingFloat.value = 0;
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [animated]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathingScale.value },
      { translateY: breathingFloat.value },
    ],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const accent = '#22E58B';
  const containerSize = size + 20;
  const iconSize = size * 0.55;

  return (
    <View
      style={[
        styles.logoContainer,
        layout === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    >
      <View style={{ width: containerSize, height: containerSize, justifyContent: 'center', alignItems: 'center' }}>
        {/* Pulse ring */}
        {animated && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: containerSize,
                height: containerSize,
                borderRadius: containerSize / 2,
                borderWidth: 1.5,
                borderColor: accent + '50',
              },
              pulseRingStyle,
            ]}
          />
        )}

        {/* Icon circle */}
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isDarkMode ? accent + '18' : accent + '12',
              borderWidth: 1.5,
              borderColor: accent + '40',
              justifyContent: 'center',
              alignItems: 'center',
            },
            animated ? animatedContainerStyle : undefined,
          ]}
        >
          <LeafIcon size={iconSize} color={accent} />
        </Animated.View>
      </View>

      {showName && (
        <Text
          style={[
            styles.brandName,
            {
              color: isDarkMode ? '#FFFFFF' : '#0D1B2A',
              marginTop: layout === 'vertical' ? 8 : 0,
              marginLeft: layout === 'horizontal' ? 10 : 0,
            },
          ]}
        >
          AgriNex
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
