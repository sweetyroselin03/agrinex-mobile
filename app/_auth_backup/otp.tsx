import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Theme ────────────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    background: '#0B1220',
    card: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    borderFocused: '#00E38C',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.55)',
    textPlaceholder: '#94A3B8',
    inputText: '#FFFFFF',
    backBtn: 'rgba(255,255,255,0.06)',
    backIcon: 'rgba(255,255,255,0.6)',
    errorText: '#F87171',
    statusBar: 'light-content' as const,
  },
  light: {
    background: '#F0FDF4',
    card: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    borderFocused: '#059669',
    textPrimary: '#0B1220',
    textSecondary: 'rgba(11,18,32,0.5)',
    textPlaceholder: '#94A3B8',
    inputText: '#0B1220',
    backBtn: 'rgba(0,0,0,0.06)',
    backIcon: 'rgba(11,18,32,0.5)',
    errorText: '#DC2626',
    statusBar: 'dark-content' as const,
  },
} as const;

const PRIMARY = '#00E38C';
const PRIMARY_DARK = '#059669';

// ─── Schema ───────────────────────────────────────────────────────────────────

const otpSchema = z.object({
  otp: z.string().length(4, 'OTP must be 4 digits'),
});
type OTPForm = z.infer<typeof otpSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OTP() {
  const router = useRouter();
  const scheme = useColorScheme();
  const T = THEMES[scheme === 'light' ? 'light' : 'dark'];
  const accent = scheme === 'light' ? PRIMARY_DARK : PRIMARY;

  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuthStore();
  const inputRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data: OTPForm) => {
    try {
      await api.post('/api/auth/otp/verify', { phone, otp: data.otp });
      // Delegate token storage to the existing login action in AuthStore
      await login({ phone: phone as string, otp: data.otp });
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: T.background }}
    >
      <StatusBar barStyle={T.statusBar} translucent backgroundColor="transparent" />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>

        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 450 }}>
          <Text style={{ color: T.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
            Verification
          </Text>
          <Text style={{ color: T.textSecondary, fontSize: 15, marginTop: 6, fontWeight: '500', lineHeight: 22 }}>
            Enter the code sent to {phone}
          </Text>
        </MotiView>

        {/* OTP Input */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 100 }}
          style={{ marginTop: 40 }}
        >
          <Controller
            control={control}
            name="otp"
            render={({ field: { onChange, value, onBlur } }) => (
              <View>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => inputRef.current?.focus()}
                  style={{
                    backgroundColor: T.card,
                    borderWidth: 1.5,
                    borderColor: errors.otp ? T.errorText : T.border,
                    borderRadius: 18,
                    height: 80,
                    justifyContent: 'center',
                    alignItems: 'center',
                    // Focus glow handled inline via state — kept simple here
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    placeholder="0000"
                    placeholderTextColor={T.textPlaceholder}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={{
                      color: T.inputText,
                      fontSize: 36,
                      fontWeight: '700',
                      letterSpacing: 16,
                      textAlign: 'center',
                      paddingVertical: 0,
                      // Fix Android vertical centering
                      includeFontPadding: false,
                    }}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    autoFocus
                  />
                </TouchableOpacity>

                {errors.otp && (
                  <Text style={{ color: T.errorText, marginTop: 8, textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                    {errors.otp.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={{
              marginTop: 28,
              height: 56,
              borderRadius: 28,
              backgroundColor: accent,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isSubmitting ? 0.7 : 1,
              // Shadow
              shadowColor: accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
              {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* Back link */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 450, delay: 200 }}
          style={{ marginTop: 28, alignItems: 'center' }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: T.textSecondary, fontSize: 14, fontWeight: '600' }}>
              Wrong number?{' '}
              <Text style={{ color: accent, fontWeight: '700' }}>Go back</Text>
            </Text>
          </TouchableOpacity>
        </MotiView>

      </View>
    </KeyboardAvoidingView>
  );
}
