import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  InteractionManager,
  StatusBar,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import Toast from '../../components/Toast';
import { checkInternet } from '../../utils/network';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const BG = '#0B1220';
const PRIMARY = '#00E38C';
const PRIMARY_END = '#00C97B';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER_IDLE = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOTP, sendOTP, isLoading } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [isVerified, setIsVerified] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const hasAutoFilled = useRef(false);

  // Synchronous locks to prevent concurrent network triggers from multi-taps or auto-fill overlap
  const isVerifying = useRef(false);
  const isResending = useRef(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const progressValue = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressValue.value * 100}%` as any }));

  const isEmail = params.authType === 'email';
  const target = (params.email as string || '').trim().replace(/\s/g, '');
  const devOtp = params.dev_otp as string | undefined;

  // Auto-focus first input on mount
  useEffect(() => {
    const t = setTimeout(() => { inputRefs.current[0]?.focus(); }, 600);
    return () => clearTimeout(t);
  }, []);

  // Auto-fill dev OTP
  useEffect(() => {
    if (devOtp && devOtp.length === 6 && !hasAutoFilled.current) {
      hasAutoFilled.current = true;
      setOtp(devOtp.split(''));
      showToast(`Dev OTP auto-filled: ${devOtp}`, 'success');
      setTimeout(() => { handleVerify(devOtp); }, 1200);
    }
  }, [devOtp]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !isVerified) {
      interval = setInterval(() => { setTimer((p) => p - 1); }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, isVerified]);

  // Success animation
  useEffect(() => {
    if (isVerified) {
      progressValue.value = withTiming(1, { duration: 1500 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isVerified]);

  const fillOtpFromString = useCallback((code: string) => {
    const digits = code.replace(/[^0-9]/g, '').slice(0, 6).split('');
    if (digits.length === 6) {
      setOtp(digits);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => handleVerify(digits.join('')), 400);
    }
  }, []);

  const handleOtpChange = useCallback((value: string, index: number) => {
    if (isVerified) return;
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (cleanValue.length >= 6) { fillOtpFromString(cleanValue); return; }
    if (!cleanValue && value) return;
    setOtp(prev => {
      const newOtp = [...prev];
      newOtp[index] = cleanValue.slice(-1);
      if (cleanValue && index < 5) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
      }
      if (index === 5 && cleanValue) {
        const s = newOtp.join('');
        if (s.length === 6) setTimeout(() => handleVerify(s), 100);
      }
      return newOtp;
    });
  }, [isVerified]);

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setOtp(prev => {
        if (!prev[index] && index > 0) {
          const newOtp = [...prev];
          newOtp[index - 1] = '';
          setTimeout(() => inputRefs.current[index - 1]?.focus(), 10);
          return newOtp;
        }
        return prev;
      });
    }
  }, []);

  const handleVerify = async (otpStringParam?: string) => {
    if (isVerifying.current || isVerified) return;
    const otpString = otpStringParam || otp.join('');
    if (otpString.length < 6) { showToast('Please enter a valid 6-digit code'); return; }
    
    isVerifying.current = true;
    setLocalLoading(true);
    try {
      const hasInternet = await checkInternet();
      if (!hasInternet) { 
        showToast('No internet connection'); 
        setLocalLoading(false); 
        isVerifying.current = false;
        return; 
      }
      const { safeApiCall } = require('../../utils/network');
      const actionPromise = (async () => {
        const response = await verifyOTP(target, otpString);
        if (response && response.access_token) {
          setIsVerified(true);
          setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace('/(tabs)'); }); }, 1500);
          return true;
        }
        if (params.type === 'register') {
          setIsVerified(true);
          setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
              router.replace({
                pathname: '/(auth)/create-password',
                params: { email: target, fullName: params.fullName as string },
              });
            });
          }, 1500);
        } else if (params.type === 'forgot') {
          setIsVerified(true);
          setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace({ pathname: '/(auth)/reset-password', params: { email: target, otp: otpString } }); }); }, 1500);
        }
        return true;
      })();
      await safeApiCall(() => actionPromise, 8000);
    } catch (e: any) {
      let errorMsg = 'Incorrect verification code.';
      if (e.message === 'timeout') errorMsg = 'Server taking too long';
      else if (e.code === 'auth/network-request-failed' || e.message?.toLowerCase().includes('network')) errorMsg = 'Unable to connect. Retrying...';
      else if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      showToast(errorMsg, 'error');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLocalLoading(false);
      isVerifying.current = false;
    }
  };

  const handleResend = useCallback(async () => {
    if (timer > 0 || isVerified || isResending.current || isVerifying.current) return;
    
    isResending.current = true;
    setLocalLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const hasInternet = await checkInternet();
      if (!hasInternet) { 
        showToast('No internet connection'); 
        setLocalLoading(false); 
        isResending.current = false;
        return; 
      }
      const { safeApiCall } = require('../../utils/network');
      const result = await safeApiCall(() => sendOTP(target), 8000);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      if (result?.dev_otp) {
        setTimeout(() => { setOtp(result.dev_otp.split('')); showToast(`New code sent. Dev OTP: ${result.dev_otp}`, 'success'); }, 500);
      } else {
        showToast('New verification code sent.', 'success');
      }
    } catch (e: any) {
      let errorMsg = 'Failed to resend code';
      if (e.message === 'timeout') errorMsg = 'Server taking too long';
      else if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      showToast(errorMsg, 'error');
    } finally {
      setLocalLoading(false);
      isResending.current = false;
    }
  }, [timer, isVerified, target]);

  // ── Verified success state ───────────────────────────────────────────────────
  if (isVerified) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(0,217,139,0.08)', 'transparent']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.successWrapper}>
          <View style={styles.successCircle}>
            <CheckCircle2 color={PRIMARY} size={56} strokeWidth={2} />
          </View>
          <Text style={styles.successText}>Verified Successfully</Text>
          <Text style={styles.successSubtext}>Taking you forward...</Text>
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Main OTP screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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

            {/* Step Indicator (only for register flow) */}
            {params.type === 'register' && (
              <Animated.View entering={FadeInDown.duration(350)} style={styles.stepRow}>
                <View style={[styles.stepDot, styles.stepDotDone]} />
                <View style={[styles.stepLine, styles.stepLineDone]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <Text style={styles.stepLabel}>Step 2 of 3</Text>
              </Animated.View>
            )}

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
              <View style={styles.shieldWrapper}>
                <ShieldCheck color={PRIMARY} size={28} />
              </View>
              <Text style={styles.title}>{params.type === 'register' ? 'Verify Your Email' : 'Verification Code'}</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit verification code to{'\n'}
                <Text style={styles.targetText}>{target}</Text>
              </Text>
            </Animated.View>

            {/* OTP inputs */}
            <View style={styles.otpSection}>
              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <View key={index} style={styles.inputContainer}>
                    <TextInput
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        { borderColor: digit ? PRIMARY : BORDER_IDLE },
                        digit ? styles.otpInputFilled : {},
                      ]}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      selectTextOnFocus
                    />
                    {digit === '' && <View style={styles.inputDot} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Footer: timer + verify button */}
            <View style={styles.footer}>
              <View style={styles.timerRow}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>
                    Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={localLoading || isLoading} style={[styles.resendBtn, (localLoading || isLoading) && { opacity: 0.5 }]}>
                    <RefreshCw color={PRIMARY} size={14} style={{ marginRight: 6 }} />
                    <Text style={styles.resendTextBtn}>Resend Code</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Animated.View style={[styles.primaryBtnShadow, { opacity: otp.join('').length < 6 ? 0.5 : 1 }, btnStyle]}>
                <Pressable
                  onPressIn={() => { buttonScale.value = withSpring(0.97, { damping: 14, stiffness: 220 }); }}
                  onPressOut={() => { buttonScale.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
                  onPress={() => handleVerify()}
                  disabled={localLoading || isLoading || otp.join('').length < 6}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    {(localLoading || isLoading) ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryText}>Verify Now</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
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
    marginBottom: 20,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 2 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  stepDotActive: { backgroundColor: PRIMARY, borderColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 3 },
  stepDotDone: { backgroundColor: PRIMARY, borderColor: PRIMARY, opacity: 0.5 },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 6, borderRadius: 1 },
  stepLineDone: { backgroundColor: 'rgba(0,227,140,0.3)' },
  stepLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, marginLeft: 'auto', letterSpacing: 0.3 },
  header: { alignItems: 'center', marginBottom: 40 },
  shieldWrapper: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,217,139,0.10)',
    borderWidth: 1, borderColor: 'rgba(0,217,139,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500', lineHeight: 22, textAlign: 'center' },
  targetText: { color: PRIMARY, fontWeight: '700' },
  otpSection: { marginBottom: 36 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  inputContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  otpInput: {
    width: 46, height: 56,
    borderRadius: 14, borderWidth: 1.5,
    backgroundColor: CARD_BG,
    textAlign: 'center',
    fontSize: 24, fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  otpInputFilled: {
    backgroundColor: 'rgba(0,217,139,0.06)',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  inputDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  footer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 8 },
  timerRow: { alignItems: 'center', marginBottom: 24 },
  timerText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
  timerHighlight: { color: PRIMARY, fontWeight: '800' },
  resendBtn: { flexDirection: 'row', alignItems: 'center' },
  resendTextBtn: { fontSize: 14, fontWeight: '700', color: PRIMARY },
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
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  // Success state
  successWrapper: { alignItems: 'center' },
  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,217,139,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,217,139,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  successText: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center', marginBottom: 6 },
  successSubtext: { fontSize: 15, fontWeight: '600', color: TEXT_MUTED, textAlign: 'center' },
  progressContainer: { width: 120, height: 4, borderRadius: 2, marginTop: 32, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
  progressBar: { height: '100%', width: 0, backgroundColor: PRIMARY, borderRadius: 2 },
});
