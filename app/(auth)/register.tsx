import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  InteractionManager, Dimensions, StatusBar, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/useAppTheme';
import Toast from '../../components/Toast';
import BrandLogo from '../../components/BrandLogo';
import { checkInternet } from '../../utils/network';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();
  const BG = theme.background;
  const CARD_BG = theme.card;
  const BORDER_IDLE = theme.border;
  const TEXT_PRIMARY = theme.text;
  const TEXT_MUTED = theme.textLight;
  const backBtnBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const iconColorIdle = theme.textLight;
  const placeholderColor = theme.placeholder;
  const PRIMARY = theme.primary;
  const PRIMARY_END = theme.secondary;
  const { sendOTP, checkAccount, isLoading, reset } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const isSubmitting = useRef(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });
  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);
  const buttonScale = useSharedValue(1);
 
  const handleContinue = useCallback(async () => {
    if (isSubmitting.current || localLoading || isLoading) return;
    if (!fullName || fullName.trim().length < 3) { showToast('Please enter your full name (min 3 chars)'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) { showToast('Please enter a valid email address'); return; }
    const identifier = email.trim().toLowerCase();
    
    isSubmitting.current = true;
    setLocalLoading(true);
    reset();
    try {
      const hasInternet = await checkInternet();
      if (!hasInternet) { 
        showToast('No internet connection'); 
        setLocalLoading(false); 
        isSubmitting.current = false;
        return; 
      }
      const { safeApiCall } = require('../../utils/network');
      const actionPromise = (async () => {
        const res = await checkAccount(identifier);
        if (res.exists) {
          showToast(res.message || 'Account already exists. Please login.', 'error');
          setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace('/(auth)/login'); }); }, 1200);
          return { success: false };
        }
        const otpResult = await sendOTP(identifier);
        return { success: true, dev_otp: otpResult?.dev_otp };
      })();
      const result = await safeApiCall(() => actionPromise, 8000);
      if (result?.success === true) {
        showToast('Verification code sent successfully', 'success');
        setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            router.push({
              pathname: '/(auth)/otp',
              params: {
                email: identifier,
                type: 'register',
                fullName: fullName.trim(),
                authType: 'email',
                ...(result.dev_otp ? { dev_otp: result.dev_otp } : {}),
              },
            });
          });
        }, 1000);
      }
    } catch (e: any) {
      let errorMsg = 'Failed to send verification code';
      if (e.message === 'timeout') errorMsg = 'Server taking too long';
      else if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      showToast(errorMsg, 'error');
    } finally { 
      setLocalLoading(false); 
      isSubmitting.current = false;
    }
  }, [fullName, email, localLoading, isLoading]);

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['rgba(0,217,139,0.08)', 'transparent', 'rgba(0,100,80,0.04)']} start={{ x: 0.8, y: 0 }} end={{ x: 0.2, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
            <TouchableOpacity style={[s.backBtn, { backgroundColor: backBtnBg }]} onPress={() => router.back()}>
              <ArrowLeft color={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)'} size={20} />
            </TouchableOpacity>

            {/* Step Indicator */}
            <Animated.View entering={FadeInDown.duration(350)} style={s.stepRow}>
              <View style={[s.stepDot, { backgroundColor: PRIMARY, borderColor: PRIMARY, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 3 }]} />
              <View style={s.stepLine} />
              <View style={s.stepDot} />
              <View style={s.stepLine} />
              <View style={s.stepDot} />
              <Text style={s.stepLabel}>Step 1 of 3</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(450)} style={s.logoRow}>
              <BrandLogo size={32} isDarkMode={isDarkMode} />
              <Text style={[s.logoName, { color: TEXT_PRIMARY }]}>AgriNex</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(450)} style={s.header}>
              <Text style={[s.title, { color: TEXT_PRIMARY }]}>Join AgriNex</Text>
              <Text style={[s.subtitle, { color: TEXT_MUTED }]}>Create your smart farming account</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(450)} style={s.form}>
              <Pressable onPress={() => fullNameRef.current?.focus()} style={[s.inputWrap, { backgroundColor: CARD_BG, borderColor: focusedField === 'fullName' ? PRIMARY : BORDER_IDLE }, focusedField === 'fullName' && { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8 }]}>
                <User color={focusedField === 'fullName' ? PRIMARY : iconColorIdle} size={18} style={s.inputIcon} />
                <TextInput ref={fullNameRef} style={[s.input, { color: TEXT_PRIMARY }]} placeholder="Full Name" placeholderTextColor={placeholderColor} autoCapitalize="words" value={fullName} onChangeText={setFullName} onFocus={() => setFocusedField('fullName')} onBlur={() => setFocusedField(null)} autoCorrect={false} onSubmitEditing={() => emailRef.current?.focus()} returnKeyType="next" />
              </Pressable>

              <Pressable onPress={() => emailRef.current?.focus()} style={[s.inputWrap, { backgroundColor: CARD_BG, borderColor: focusedField === 'email' ? PRIMARY : BORDER_IDLE }, focusedField === 'email' && { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 8 }]}>
                <Mail color={focusedField === 'email' ? PRIMARY : iconColorIdle} size={18} style={s.inputIcon} />
                <TextInput ref={emailRef} style={[s.input, { color: TEXT_PRIMARY }]} placeholder="Email address" placeholderTextColor={placeholderColor} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} autoCorrect={false} onSubmitEditing={handleContinue} returnKeyType="done" />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(450)} style={s.btnGroup}>
              <View style={[s.btnShadow, { shadowColor: PRIMARY }]}>
                <Pressable onPressIn={() => { buttonScale.value = withSpring(0.97, { damping: 14, stiffness: 220 }); }} onPressOut={() => { buttonScale.value = withSpring(1, { damping: 14, stiffness: 220 }); }} onPress={handleContinue} disabled={localLoading || isLoading} style={s.primaryBtn}>
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryGrad}>
                    {(localLoading || isLoading) ? <ActivityIndicator color="white" /> : (
                      <View style={s.btnContent}>
                        <Text style={s.primaryText}>Continue</Text>
                        <ChevronRight color="white" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(380).duration(450)} style={s.footer}>
              <Text style={[s.footerText, { color: TEXT_MUTED }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[s.footerLink, { color: PRIMARY }]}>Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  backBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, paddingHorizontal: 2 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(128,128,128,0.2)', borderWidth: 1.5, borderColor: 'rgba(128,128,128,0.25)' },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 6, borderRadius: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', marginLeft: 'auto', letterSpacing: 0.3 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logoName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  header: { marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  btnGroup: { marginTop: 32 },
  btnShadow: { width: '100%', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  primaryBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden' },
  primaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
