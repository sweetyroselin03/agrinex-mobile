import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';

const otpSchema = z.object({
  otp: z.string().length(4, 'OTP must be 4 digits'),
});

type OTPForm = z.infer<typeof otpSchema>;

export default function OTP() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const setAuth = useAuthStore(state => state.setAuth);

  const { control, handleSubmit, formState: { errors } } = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data: OTPForm) => {
    try {
      const response = await api.post('/api/auth/otp/verify', { phone, otp: data.otp });
      // In a real app, response.data would contain token and user
      // Mocking for now based on backend logic
      setAuth(response.data.token, { 
        id: response.data.user_id, 
        phone: phone as string, 
        name: 'Farmer' 
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View className="flex-1 justify-center px-8">
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Text className="text-white text-3xl font-bold">Verification</Text>
          <Text className="text-textSecondary text-lg mt-2">Enter code sent to {phone}</Text>
        </MotiView>

        <View className="mt-10">
          <Controller
            control={control}
            name="otp"
            render={({ field: { onChange, value } }) => (
              <View>
                <TextInput
                  placeholder="0000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={4}
                  className="bg-secondary/50 border border-white/10 text-white p-6 rounded-2xl text-center text-3xl tracking-widest"
                  onChangeText={onChange}
                  value={value}
                  autoFocus
                />
                {errors.otp && <Text className="text-red-400 mt-2 text-center">{errors.otp.message}</Text>}
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            className="bg-emerald py-4 rounded-2xl items-center shadow-lg shadow-emerald/50 mt-8"
          >
            <Text className="text-white text-lg font-semibold">Verify & Continue</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} className="mt-6 self-center">
          <Text className="text-textSecondary">Wrong number? Go back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
