import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  InteractionManager,
  Dimensions,
  StatusBar,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, ChevronRight, Lock } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import Toast from '../../components/Toast';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const BG = '#0B1220';
const PRIMARY = '#00E38C';
const PRIMARY_END = '#00C97B';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER_IDLE = 'rgba(255,255,255,0.08)';
const BORDER_FOCUS = '#00E38C';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

// Stable Input Component removed to prevent Android/iOS keyboard blur issues

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const { isLoading, reset } = useAuthStore();
  const isSubmitting = useRef(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const buttonScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  const handleSend = useCallback(async () => {
    if (isSubmitting.current || isLoading) return;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid email address');
      return;
    }

    isSubmitting.current = true;
    reset();

    try {
      const { safeApiCall } = require('../../utils/network');
      const response = await safeApiCall(
        () => require('../../api/client').default.post('/auth/forgot-password', { email: trimmed }),
        5000
      );
      const devOtp = response?.data?.dev_otp;
      showToast('Recovery code sent successfully.', 'success');
      setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          router.push({
            pathname: '/(auth)/otp',
            params: {
              email: trimmed,
              type: 'forgot',
              authType: 'email',
              ...(devOtp ? { dev_otp: devOtp } : {}),
            },
          });
        });
      }, 800);
    } catch (e: any) {
      let errorMsg = 'Unable to send recovery code. Please try again.';
      if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      else if (e.message?.toLowerCase().includes('network') || e.message?.toLowerCase().includes('timeout'))
        errorMsg = 'Unable to connect. Please check your internet.';
      showToast(errorMsg, 'error');
    } finally {
      isSubmitting.current = false;
    }
  }, [email, isLoading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Minimal ambient background ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(0,217,139,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >

            {/* Back */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="rgba(255,255,255,0.6)" size={20} />
            </TouchableOpacity>

            {/* Icon + Header */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
              <View style={styles.iconCircle}>
                <Lock color={PRIMARY} size={26} />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter your email and we'll send you a recovery code.
              </Text>
            </Animated.View>

            {/* Input */}
            <View style={styles.form}>
              <Pressable
                onPress={() => emailRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <Mail
                  color={focusedField === 'email' ? PRIMARY : 'rgba(255,255,255,0.35)'}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  onSubmitEditing={handleSend}
                  returnKeyType="done"
                />
              </Pressable>
            </View>

            {/* Send Button */}
            <View style={styles.buttonGroup}>
              <View style={styles.primaryBtnShadow}>
                <Pressable
                  onPress={handleSend}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    {isLoading ? <ActivityIndicator color="white" /> : (
                      <View style={styles.btnContent}>
                        <Text style={styles.primaryText}>Send Recovery Code</Text>
                        <ChevronRight color="white" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {/* Back to Login */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,217,139,0.10)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,217,139,0.15)',
  },
  title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500', lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', height: 58,
    borderRadius: 18, backgroundColor: CARD_BG, borderWidth: 1,
    borderColor: BORDER_IDLE, paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: TEXT_PRIMARY, paddingVertical: 0 },
  buttonGroup: { marginTop: 28 },
  primaryBtnShadow: {
    width: '100%',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden' },
  primaryGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, fontWeight: '500', color: TEXT_MUTED },
  footerLink: { fontSize: 14, fontWeight: '700', color: PRIMARY },
});
