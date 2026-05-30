import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import BrandLogo from '../components/BrandLogo';
import { AlertCircle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const BG = '#0B1220';
const PRIMARY = '#00C896';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

export default function RedirectScreen() {
  const router = useRouter();
  const { isAuthenticated, error } = useAuthStore();
  const [statusMessage, setStatusMessage] = useState('Verifying authentication...');
  const [authError, setAuthError] = useState<string | null>(null);

  // Animated background elements (similar to login screen for design continuity)
  const blobScale = useSharedValue(1);
  useEffect(() => {
    blobScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 4000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0.9, { duration: 4000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      true
    );
  }, []);

  const animatedBlobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blobScale.value }],
  }));

  useEffect(() => {
    // If user is already authenticated, go directly to tabs dashboard
    if (isAuthenticated) {
      setStatusMessage('Authentication successful! Loading dashboard...');
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
      return () => clearTimeout(timeout);
    }

    // Set a safety timeout. If authentication is not completed within 7 seconds,
    // redirect the user back to the login screen with an error.
    const safetyTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        setAuthError('Authentication timed out. Please try again.');
        const redirectTimeout = setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2500);
        return () => clearTimeout(redirectTimeout);
      }
    }, 7000);

    return () => clearTimeout(safetyTimeout);
  }, [isAuthenticated]);

  useEffect(() => {
    if (error) {
      setAuthError(error);
      const timeout = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return (
    <View style={styles.container}>
      {/* Sleek Cinematic Background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(0,200,150,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.blob,
            animatedBlobStyle,
            { backgroundColor: PRIMARY, left: -60, top: -60 }
          ]}
        />
      </View>

      <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
        <View style={styles.logoWrapper}>
          <BrandLogo size={70} animated={true} />
        </View>

        {authError ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconWrapper}>
              <AlertCircle color="#EF4444" size={32} />
            </View>
            <Text style={styles.errorTitle}>Sign-In Failed</Text>
            <Text style={styles.errorMessage}>{authError}</Text>
            <Text style={styles.redirectSubtext}>Returning you to the login screen...</Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY} style={styles.spinner} />
            <Text style={styles.statusText}>{statusMessage}</Text>
            <Text style={styles.subText}>Completing security checks...</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '80%',
    padding: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  blob: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.12,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  redirectSubtext: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
