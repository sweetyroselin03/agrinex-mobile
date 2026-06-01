import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, Users, Scan, MessageCircle, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn,
  FadeInDown,
  ZoomIn
} from 'react-native-reanimated';
import { useAppTheme } from '../hooks/useAppTheme';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

const PulseGlow = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulseCircle, animatedStyle]} />
  );
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, theme } = useAppTheme();

  const navItems = [
    { name: 'dashboard', icon: LayoutDashboard, path: '/(tabs)' },
    { name: 'community', icon: Users, path: '/(tabs)/community' },
    { name: 'scanner', icon: Scan, path: '/(tabs)/scan', primary: true },
    { name: 'chat', icon: MessageCircle, path: '/(tabs)/chat' },
    { name: 'profile', icon: User, path: '/(tabs)/profile' },
  ];

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.path || (item.path === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)'));
    const Icon = item.icon;
    
    const scale = useSharedValue(1);
    const opacity = useSharedValue(isActive ? 1 : 0.4);

    useEffect(() => {
      opacity.value = withTiming(isActive ? 1 : 0.4, { duration: 300 });
      scale.value = withTiming(isActive ? 1.15 : 1, { duration: 300 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    if (item.primary) {
      return (
        <TouchableOpacity
          key={item.name}
          activeOpacity={0.8}
          onPress={() => router.push(item.path as any)}
          style={styles.primaryButtonContainer}
        >
          <PulseGlow />
          <View style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <Icon color="white" size={28} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={item.name}
        activeOpacity={0.7}
        onPress={() => router.push(item.path as any)}
        style={styles.navItem}
      >
        <Animated.View style={animatedStyle}>
          <Icon
            color={isActive ? theme.primary : theme.text}
            size={24}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </Animated.View>
        {isActive && (
          <Animated.View
            entering={ZoomIn.duration(300)}
            style={[styles.activeDot, { backgroundColor: theme.primary }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(500).duration(800)}
      style={styles.container}
    >
      <View style={styles.navBarWrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={25} style={[styles.blurBackground, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.75)' }]} />
        ) : (
          <View style={[styles.blurBackground, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)' }]} />
        )}
        <View style={styles.navItemsRow}>
          {navItems.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  navBarWrapper: {
    width: width * 0.9,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  navItemsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  primaryButtonContainer: {
    top: -24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 15,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    zIndex: -1,
  },
});

