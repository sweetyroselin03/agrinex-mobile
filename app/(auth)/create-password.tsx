import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  InteractionManager, Dimensions, StatusBar, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring,
  withTiming, withDelay, withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff, ShieldCheck, Check, Sparkles, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import * as Haptics from 'expo-haptics';
import Toast from '../../components/Toast';
import BrandLogo from '../../components/BrandLogo';
import { checkInternet } from '../../utils/network';

const { width, height } = Dimensions.get('window');
const BG = '#0B1220';
const PRIMARY = '#00E38C';
const PRIMARY_END = '#00C97B';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER_IDLE = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register, setPassword, isLoading } = useAuthStore();

  const [passwordVal, setPasswordVal] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });
  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message: msg, type });
  }, []);

  // Success animation values
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const successTextOpacity = useSharedValue(0);
  const successTextY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonY = useSharedValue(20);

  const email = params.email as string;
  const fullName = params.fullName as string;

  // Password strength
  useEffect(() => {
    let s = 0;
    if (passwordVal.length >= 8) s += 1;
    if (/\d/.test(passwordVal)) s += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(passwordVal)) s += 1;
    if (/[A-Z]/.test(passwordVal)) s += 1;
    setStrength(s);
  }, [passwordVal]);

  const requirements = [
    { label: '8+ Characters', met: passwordVal.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(passwordVal) },
    { label: 'One Number', met: /\d/.test(passwordVal) },
    { label: 'Special Char', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordVal) },
  ];

  const getStrengthColor = () => {
    if (strength <= 1) return '#EF4444';
    if (strength <= 2) return '#F59E0B';
    return PRIMARY;
  };
  const getStrengthLabel = () => {
    if (strength <= 1) return 'Weak';
    if (strength <= 2) return 'Fair';
    if (strength <= 3) return 'Strong';
    return 'Excellent';
  };

  // Trigger success animations
  const playSuccessAnimation = useCallback(() => {
    ringScale.value = withSequence(
      withTiming(1.2, { duration: 400 }),
      withTiming(1, { duration: 300 }),
    );
    ringOpacity.value = withTiming(1, { duration: 400 });
    checkScale.value = withDelay(200, withSequence(
      withTiming(1.3, { duration: 300 }),
      withSpring(1, { damping: 8, stiffness: 150 }),
    ));
    checkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    successTextOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    successTextY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 150 }));
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    buttonY.value = withDelay(900, withSpring(0, { damping: 12, stiffness: 150 }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));
  const successTxtStyle = useAnimatedStyle(() => ({
    opacity: successTextOpacity.value,
    transform: [{ translateY: successTextY.value }],
  }));
  const successBtnStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }));

  const handleCreateAccount = useCallback(async () => {
    if (localLoading || isLoading) return;
    if (!email) { showToast('Session expired. Please try again.'); setTimeout(() => router.replace('/(auth)/register'), 1500); return; }
    if (!passwordVal || !confirmPassword) { showToast('Please fill in all fields'); return; }
    if (passwordVal !== confirmPassword) { showToast('Passwords do not match'); return; }
    if (strength < 3) { showToast('Please use a stronger password'); return; }

    setLocalLoading(true);
    try {
      const hasInternet = await checkInternet();
      if (!hasInternet) { showToast('No internet connection'); setLocalLoading(false); return; }
      const { safeApiCall } = require('../../utils/network');

      await safeApiCall(async () => {
        await register({ email, full_name: fullName, phone: '' });
        await setPassword(email, passwordVal);
      }, 12000);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSuccess(true);
      playSuccessAnimation();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let errorMsg = 'Failed to create account. Please try again.';
      if (e.message === 'timeout') errorMsg = 'Server taking too long';
      else if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      showToast(errorMsg, 'error');
    } finally { setLocalLoading(false); }
  }, [email, fullName, passwordVal, confirmPassword, strength, localLoading, isLoading]);

  const handleEnterApp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    InteractionManager.runAfterInteractions(() => { router.replace('/(tabs)'); });
  }, []);

  // ── Success State ──
  if (isSuccess) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient colors={['rgba(0,217,139,0.12)', 'transparent', 'rgba(0,100,80,0.06)']} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 0.8 }} style={StyleSheet.absoluteFill} />
        </View>

        {/* Animated checkmark ring */}
        <Animated.View style={[s.successRing, ringStyle]}>
          <Animated.View style={[s.successCheckWrap, checkStyle]}>
            <View style={s.successCheckCircle}>
              <Check color="#FFFFFF" size={40} strokeWidth={3} />
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View style={successTxtStyle}>
          <Text style={s.successTitle}>Account Created Successfully</Text>
          <Text style={s.successSub}>Welcome to the future of smart farming</Text>
        </Animated.View>

        <Animated.View style={[s.successBtnWrap, successBtnStyle]}>
          <Pressable onPress={handleEnterApp} style={s.successBtn}>
            <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.successBtnGrad}>
              <Text style={s.successBtnText}>Enter AgriNex</Text>
              <ArrowRight color="white" size={18} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ── Main Form ──
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['rgba(0,217,139,0.06)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">

            {/* Step Indicator */}
            <Animated.View entering={FadeInDown.duration(350)} style={s.stepRow}>
              <View style={[s.stepDot, s.stepDotDone]} />
              <View style={[s.stepLine, s.stepLineDone]} />
              <View style={[s.stepDot, s.stepDotDone]} />
              <View style={[s.stepLine, s.stepLineDone]} />
              <View style={[s.stepDot, s.stepDotActive]} />
              <Text style={s.stepLabel}>Step 3 of 3</Text>
            </Animated.View>

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(450)} style={s.header}>
              <View style={s.iconCircle}>
                <ShieldCheck color={PRIMARY} size={28} />
              </View>
              <Text style={s.title}>Secure Your Account</Text>
              <Text style={s.subtitle}>Create a strong password</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(150).duration(450)} style={s.form}>
              <Pressable onPress={() => passwordRef.current?.focus()} style={[s.inputWrap, focusedField === 'password' && s.inputFocus]}>
                <Lock color={focusedField === 'password' ? PRIMARY : 'rgba(255,255,255,0.35)'} size={18} style={s.inputIcon} />
                <TextInput ref={passwordRef} style={s.input} placeholder="Create Password" placeholderTextColor="rgba(255,255,255,0.3)" secureTextEntry={!showPassword} value={passwordVal} onChangeText={setPasswordVal} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} autoCorrect={false} autoCapitalize="none" onSubmitEditing={() => confirmPasswordRef.current?.focus()} returnKeyType="next" />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? <EyeOff color="rgba(255,255,255,0.35)" size={18} /> : <Eye color="rgba(255,255,255,0.35)" size={18} />}
                </TouchableOpacity>
              </Pressable>

              {/* Strength meter */}
              {passwordVal.length > 0 && (
                <View style={s.strengthBox}>
                  <View style={s.strengthBars}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[s.strengthBar, { backgroundColor: i <= strength ? getStrengthColor() : 'rgba(255,255,255,0.08)' }]} />
                    ))}
                  </View>
                  <Text style={[s.strengthLabel, { color: getStrengthColor() }]}>{getStrengthLabel()}</Text>
                </View>
              )}

              <Pressable onPress={() => confirmPasswordRef.current?.focus()} style={[s.inputWrap, focusedField === 'confirmPassword' && s.inputFocus]}>
                <Lock color={focusedField === 'confirmPassword' ? PRIMARY : 'rgba(255,255,255,0.35)'} size={18} style={s.inputIcon} />
                <TextInput ref={confirmPasswordRef} style={s.input} placeholder="Confirm Password" placeholderTextColor="rgba(255,255,255,0.3)" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} autoCorrect={false} autoCapitalize="none" onSubmitEditing={handleCreateAccount} returnKeyType="done" />
                <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showConfirmPassword ? <EyeOff color="rgba(255,255,255,0.35)" size={18} /> : <Eye color="rgba(255,255,255,0.35)" size={18} />}
                </TouchableOpacity>
              </Pressable>

              {/* Requirements grid */}
              <View style={s.reqGrid}>
                {requirements.map((req, i) => (
                  <View key={i} style={s.reqItem}>
                    <View style={[s.reqDot, req.met && s.reqDotMet]}>
                      {req.met && <Check color="white" size={9} strokeWidth={4} />}
                    </View>
                    <Text style={[s.reqText, { color: req.met ? TEXT_PRIMARY : TEXT_MUTED }]}>{req.label}</Text>
                  </View>
                ))}
              </View>

              {/* Create Account Button */}
              <View style={s.btnShadow}>
                <Pressable onPress={handleCreateAccount} disabled={localLoading || isLoading} style={s.primaryBtn}>
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryGrad}>
                    {(localLoading || isLoading) ? <ActivityIndicator color="white" /> : (
                      <View style={s.btnContent}>
                        <Text style={s.primaryText}>Create Account</Text>
                        <Sparkles color="white" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  // Step Indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 2 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  stepDotActive: { backgroundColor: PRIMARY, borderColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 3 },
  stepDotDone: { backgroundColor: PRIMARY, borderColor: PRIMARY, opacity: 0.5 },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 6, borderRadius: 1 },
  stepLineDone: { backgroundColor: 'rgba(0,227,140,0.3)' },
  stepLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, marginLeft: 'auto', letterSpacing: 0.3 },
  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,217,139,0.10)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,217,139,0.15)',
  },
  title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500', lineHeight: 22, textAlign: 'center', paddingHorizontal: 12 },
  // Form
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_IDLE, paddingHorizontal: 16 },
  inputFocus: { borderColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: TEXT_PRIMARY, paddingVertical: 0 },
  // Strength
  strengthBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  strengthBars: { flexDirection: 'row', gap: 5, flex: 1, marginRight: 10 },
  strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
  // Requirements
  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  reqDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  reqDotMet: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  reqText: { fontSize: 12, fontWeight: '600' },
  // Button
  btnShadow: { width: '100%', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4, marginTop: 8 },
  primaryBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden' },
  primaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  // Success State
  successRing: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: 'rgba(0,227,140,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  successCheckWrap: { justifyContent: 'center', alignItems: 'center' },
  successCheckCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  successSub: { fontSize: 15, fontWeight: '500', color: TEXT_MUTED, textAlign: 'center' },
  successBtnWrap: { marginTop: 40, width: '80%' },
  successBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  successBtnGrad: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  successBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
});
