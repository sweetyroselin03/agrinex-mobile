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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, ArrowLeft, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuthStore } from '../../store/useAuthStore';
import * as Haptics from 'expo-haptics';
import Toast from '../../components/Toast';

const { height } = Dimensions.get('window');

export default function ResetPasswordScreen() {
  const { isDarkMode, theme } = useAppTheme();
  const PRIMARY = theme.primary;
  const PRIMARY_END = theme.secondary;
  const TEXT_PRIMARY = theme.text;
  const TEXT_MUTED = theme.textLight;
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetPassword, isLoading } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleReset = useCallback(async () => {
    if (!password || !confirmPassword) { showToast('Please fill in all fields'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match'); return; }
    if (password.length < 8) { showToast('Password must be at least 8 characters'); return; }

    try {
      await resetPassword({ email: params.email as string, otp: params.otp as string, new_password: password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Password reset successful!', 'success');
      setTimeout(() => { InteractionManager.runAfterInteractions(() => { router.replace('/(auth)/login'); }); }, 1500);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(e.response?.data?.detail || 'Failed to reset password', 'error');
    }
  }, [password, confirmPassword]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[isDarkMode ? 'rgba(0,217,139,0.06)' : 'rgba(0,217,139,0.03)', 'transparent']}
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
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
              onPress={() => router.back()}
            >
              <ArrowLeft color={theme.textLight} size={20} />
            </TouchableOpacity>

            {/* Icon + Header */}
            <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(0,217,139,0.10)' : 'rgba(0,217,139,0.06)', borderColor: theme.border }]}>
                <ShieldCheck color={PRIMARY} size={26} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>New Password</Text>
              <Text style={[styles.subtitle, { color: theme.textLight }]}>Set a strong and secure password to protect your account</Text>
            </Animated.View>

            {/* Form */}
            <View style={styles.form}>
              <Pressable
                onPress={() => passwordRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: focusedField === 'password' ? theme.primary : theme.border },
                ]}
              >
                <Lock
                  color={focusedField === 'password' ? PRIMARY : theme.textLight}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.text }]}
                  placeholder="New Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={togglePassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword
                    ? <EyeOff color={theme.textLight} size={18} />
                    : <Eye color={theme.textLight} size={18} />
                  }
                </TouchableOpacity>
              </Pressable>

              <Pressable
                onPress={() => confirmPasswordRef.current?.focus()}
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: focusedField === 'confirmPassword' ? theme.primary : theme.border },
                ]}
              >
                <Lock
                  color={focusedField === 'confirmPassword' ? PRIMARY : theme.textLight}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={handleReset}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showConfirmPassword
                    ? <EyeOff color={theme.textLight} size={18} />
                    : <Eye color={theme.textLight} size={18} />
                  }
                </TouchableOpacity>
              </Pressable>

              <View style={[styles.primaryBtnShadow, { shadowColor: PRIMARY }]}>
                <Pressable
                  onPress={handleReset}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  <LinearGradient colors={[PRIMARY, PRIMARY_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                    {isLoading ? <ActivityIndicator color="white" /> : (
                      <View style={styles.btnContent}>
                        <Text style={styles.primaryText}>Update Password</Text>
                        <CheckCircle2 color="white" size={18} />
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
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22, textAlign: 'center', paddingHorizontal: 12 },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', height: 58,
    borderRadius: 18, borderWidth: 1, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  primaryBtnShadow: {
    width: '100%',
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
