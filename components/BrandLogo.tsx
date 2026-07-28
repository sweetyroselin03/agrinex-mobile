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
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
  isDarkMode?: boolean;
  showName?: boolean;
  layout?: 'horizontal' | 'vertical';
}

/** Vector AgriNex Smart Leaf + AI Circuit pattern SVG icon */
export function AgriNexIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="agriGreen" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#22C55E" />
          <Stop offset="100%" stopColor="#15803D" />
        </LinearGradient>
        <LinearGradient id="aiGlow" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#86EFAC" />
          <Stop offset="100%" stopColor="#22C55E" />
        </LinearGradient>
      </Defs>

      {/* Outer Leaf Silhouette */}
      <Path
        d="M34 14C18 18 13.8 30.3 9.64 40.7L13.42 42L15.32 37.4C16.28 37.7 17.28 38 18.34 38C27.74 38 34.92 29.88 37.46 22.84C40 15.8 40 6 40 6C32.36 6 26.84 8.14 23.2 10.8"
        fill="url(#agriGreen)"
        fillOpacity={0.25}
        stroke="url(#agriGreen)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main Vein with AI Circuit Node Connections */}
      <Path
        d="M16 32C19 26 24 20 34 14"
        stroke="url(#aiGlow)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M22 26L28 28"
        stroke="url(#aiGlow)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M26 21L32 22"
        stroke="url(#aiGlow)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* AI Nodes */}
      <Circle cx={34} cy={14} r={3.5} fill="#86EFAC" />
      <Circle cx={28} cy={28} r={2.5} fill="#4ADE80" />
      <Circle cx={32} cy={22} r={2.5} fill="#4ADE80" />
      <Circle cx={16} cy={32} r={2.5} fill="#22C55E" />
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

  useEffect(() => {
    if (animated) {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      breathingFloat.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 2400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      breathingScale.value = 1;
      breathingFloat.value = 0;
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathingScale.value },
      { translateY: breathingFloat.value },
    ],
  }));

  const containerSize = size;

  return (
    <View
      style={[
        styles.logoContainer,
        layout === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)',
            borderWidth: 1.5,
            borderColor: 'rgba(34, 197, 94, 0.35)',
            justifyContent: 'center',
            alignItems: 'center',
          },
          animated ? animatedStyle : undefined,
        ]}
      >
        <AgriNexIcon size={size * 0.65} />
      </Animated.View>

      {showName && (
        <Text
          style={[
            styles.brandName,
            {
              color: isDarkMode ? '#FFFFFF' : '#0F172A',
              marginTop: layout === 'vertical' ? 10 : 0,
              marginLeft: layout === 'horizontal' ? 12 : 0,
            },
          ]}
        >
          AgriNex AI
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
