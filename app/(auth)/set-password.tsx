import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Eye, EyeOff, ShieldCheck, ChevronRight, Check } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import * as Haptics from 'expo-haptics';
import Toast from '../../components/Toast';

const { height } = Dimensions.get('window');

const BG = '#0B1220';
const PRIMARY = '#00E38C';
const PRIMARY_END = '#00C97B';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER_IDLE = 'rgba(255,255,255,0.08)';
const BORDER_FOCUS = '#00E38C';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';

// PasswordInput component removed to prevent Android/iOS keyboard blur issues

export default function SetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setPassword, isLoading } = useAuthStore();

  const [passwordVal, setPasswordVal] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [strength, setStrength] = useState(0);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({
    visible: false, message: '', type: 'error',
  });

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const togglePassword = useCallback(() => setShowPassword(p => !p), []);

  const buttonScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  const email = params.email as string;

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
    { label: 'One Number', met: /\d/.test(passwordVal) },
    { label: 'Special Char', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordVal) },
    { label: 'Uppercase', met: /[A-Z]/.test(passwordVal) },
  ];

  const getStrengthColor = () => {
    if (strength <= 1) return '#EF4444';
    if (strength <= 2) return '#F59E0B';
    return PRIMARY;
  };

  const handleCompleteSetup = useCallback(async () => {
    if (!email) { showToast('Session expired. Please try registering again.'); setTimeout(() => router.replace('/(auth)/register'), 1500); return; }
    if (!passwordVal || !confirmPassword) { showToast('Please fill in all fields'); return; }
    if (passwordVal !== confirmPassword) { showToast('Passwords do not match'); return; }
    if (strength < 3) { showToast('Please use a stronger password'); return; }

    try {
      await setPassword(email, passwordVal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Setup complete! Welcome to AgriNex', 'success');
      setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace('/(tabs)'); }); }, 1000);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(e.response?.data?.detail || 'Failed to set password. Please try again.', 'error');
    }
  }, [email, passwordVal, confirmPassword, strength]);

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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >

            {/* Icon + Header */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
              <View style={styles.iconCircle}>
                <ShieldCheck color={PRIMARY} size={28} />
              </View>
              <Text style={styles.title}>Secure Your Account</Text>
              <Text style={styles.subtitle}>Create a strong password to protect your farming data</Text>
            </Animated.View>

            {/* Form */}
            <View style={styles.form}>
              <Pressable
                onPress={() => passwordRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <Lock
                  color={focusedField === 'password' ? PRIMARY : 'rgba(255,255,255,0.35)'}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Create Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPassword}
                  value={passwordVal}
                  onChangeText={setPasswordVal}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={togglePassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword
                    ? <EyeOff color="rgba(255,255,255,0.35)" size={18} />
                    : <Eye color="rgba(255,255,255,0.35)" size={18} />
                  }
                </TouchableOpacity>
              </Pressable>

              {/* Strength meter */}
              {passwordVal.length > 0 && (
                <View style={styles.strengthBox}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? getStrengthColor() : 'rgba(255,255,255,0.08)' }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
                    {strength <= 1 ? 'Weak' : strength <= 2 ? 'Fair' : strength <= 3 ? 'Strong' : 'Excellent'}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => confirmPasswordRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                ]}
              >
                <Lock
                  color={focusedField === 'confirmPassword' ? PRIMARY : 'rgba(255,255,255,0.35)'}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={handleCompleteSetup}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showConfirmPassword
                    ? <EyeOff color="rgba(255,255,255,0.35)" size={18} />
                    : <Eye color="rgba(255,255,255,0.35)" size={18} />
                  }
                </TouchableOpacity>
              </Pressable>

              {/* Requirements grid */}
              <View style={styles.reqGrid}>
                {requirements.map((req, i) => (
                  <View key={i} style={styles.reqItem}>
                    <View style={[styles.reqDot, req.met && styles.reqDotMet]}>
                      {req.met && <Check color="white" size={9} strokeWidth={4} />}
                    </View>
                    <Text style={[styles.reqText, { color: req.met ? TEXT_PRIMARY : TEXT_MUTED }]}>{req.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.primaryBtnShadow}>
                <Pressable
                  onPress={handleCompleteSetup}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    {isLoading ? <ActivityIndicator color="white" /> : (
                      <View style={styles.btnContent}>
                        <Text style={styles.primaryText}>Complete Setup</Text>
                        <ChevronRight color="white" size={18} />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
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
    paddingTop: 40,
    paddingBottom: 40,
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
  title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: TEXT_MUTED, fontWeight: '500', lineHeight: 22, textAlign: 'center', paddingHorizontal: 12 },
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
  strengthBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  strengthBars: { flexDirection: 'row', gap: 5, flex: 1, marginRight: 10 },
  strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  reqDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  reqDotMet: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  reqText: { fontSize: 12, fontWeight: '600' },
  primaryBtnShadow: {
    width: '100%',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 6,
  },
  primaryBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden' },
  primaryGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
});
