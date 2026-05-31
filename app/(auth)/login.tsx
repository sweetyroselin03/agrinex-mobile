import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
  Dimensions,
  StatusBar,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ArrowLeft, ChevronRight, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/useAuthStore';
import BrandLogo from '../../components/BrandLogo';
import Toast from '../../components/Toast';
import * as Haptics from 'expo-haptics';
import { checkInternet } from '../../utils/network';

const { width, height } = Dimensions.get('window');

const BG = '#0B1220';
const PRIMARY = '#00E38C';
const PRIMARY_END = '#00C97B';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER_IDLE = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

export default function LoginScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, login, reset } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const togglePassword = useCallback(() => setShowPassword(p => !p), []);
  const toggleRemember = useCallback(() => setRememberMe(p => !p), []);

  const buttonScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  useEffect(() => {
    const loadRemembered = async () => {
      try {
        const saved = await AsyncStorage.getItem('agrinex_remembered_creds');
        if (saved) {
          const { identifier, pass } = JSON.parse(saved);
          setEmail(identifier);
          setPassword(pass);
          setRememberMe(true);
        }
      } catch (_) { }
    };
    loadRemembered();
  }, []);

  const handleLogin = useCallback(async () => {
    if (localLoading || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const identifier = email.trim().toLowerCase();
    if (!identifier || !password) { showToast('Please enter your credentials'); return; }

    setLocalLoading(true);
    reset();
    try {
      const hasInternet = await checkInternet();
      if (!hasInternet) { showToast('No internet connection'); setLocalLoading(false); return; }
      const { safeApiCall } = require('../../utils/network');
      await safeApiCall(() => login({ email: identifier, password }), 8000);
      if (rememberMe) {
        await AsyncStorage.setItem('agrinex_remembered_creds', JSON.stringify({ identifier: email, pass: password }));
      } else {
        await AsyncStorage.removeItem('agrinex_remembered_creds');
      }
      showToast('Login successful!', 'success');
      setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace('/(tabs)'); }); }, 800);
    } catch (e: any) {
      let errorMsg = 'Please check your credentials and try again.';
      if (e.message === 'timeout') errorMsg = 'Server taking too long';
      else if (e.code === 'auth/network-request-failed' || e.message?.toLowerCase().includes('network')) errorMsg = 'Internet connection issue';
      else if (e.response?.data?.detail) errorMsg = e.response.data.detail;
      showToast(errorMsg, 'error');
    } finally { setLocalLoading(false); }
  }, [email, password, localLoading, isLoading, rememberMe]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(0,217,139,0.08)', 'transparent', 'rgba(0,100,80,0.04)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {/* Back */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="rgba(255,255,255,0.6)" size={20} />
            </TouchableOpacity>

            {/* Logo */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.logoRow}>
              <BrandLogo size={32} />
              <Text style={styles.logoName}>AgriNex</Text>
            </Animated.View>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your smart farming journey</Text>
            </Animated.View>

            {/* Form */}
            <View style={styles.form}>
              <Pressable
                onPress={() => { if (emailRef.current) emailRef.current.focus(); }}
                style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}
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
                  onSubmitEditing={() => { if (passwordRef.current) passwordRef.current.focus(); }}
                  returnKeyType="next"
                />
              </Pressable>

              <Pressable
                onPress={() => { if (passwordRef.current) passwordRef.current.focus(); }}
                style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}
              >
                <Lock
                  color={focusedField === 'password' ? PRIMARY : 'rgba(255,255,255,0.35)'}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={togglePassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword
                    ? <EyeOff color="rgba(255,255,255,0.35)" size={18} />
                    : <Eye color="rgba(255,255,255,0.35)" size={18} />
                  }
                </TouchableOpacity>
              </Pressable>

              <View style={styles.optionsRow}>
                <TouchableOpacity onPress={toggleRemember} style={styles.rememberBtn}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Check color="white" size={10} strokeWidth={3.5} />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <View style={styles.buttonGroup}>
              <View style={styles.primaryBtnShadow}>
                <Pressable
                  onPress={handleLogin}
                  disabled={localLoading || isLoading}
                  style={styles.primaryBtn}
                >
                  <LinearGradient
                    colors={[PRIMARY, PRIMARY_END]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryGradient}
                  >
                    {(localLoading || isLoading) ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.primaryText}>Sign In</Text>
                        <ChevronRight color="white" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to AgriNex? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerLink}>Create Account</Text>
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
    marginBottom: 24,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  logoName: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  header: { marginBottom: 28 },
  title: { fontSize: 34, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500', lineHeight: 22 },
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
  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 2, marginTop: 2,
  },
  rememberBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  rememberText: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  forgotText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  buttonGroup: { marginTop: 28, gap: 16 },
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