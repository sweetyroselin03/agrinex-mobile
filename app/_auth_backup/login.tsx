import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/useAuthStore';

const loginSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      // Mocking OTP generation for now
      const response = await api.post('/api/auth/otp/generate', { phone: data.phone });
      router.push({
        pathname: '/otp',
        params: { phone: data.phone }
      });
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
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
        >
          <Text className="text-white text-3xl font-bold">Welcome Back</Text>
          <Text className="text-textSecondary text-lg mt-2">Sign in to your farm</Text>
        </MotiView>

        <View className="mt-10 space-y-6">
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="text-textSecondary mb-2 ml-1">Phone Number</Text>
                <TextInput
                  placeholder="+91 00000 00000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  className="bg-secondary/50 border border-white/10 text-white p-4 rounded-2xl"
                  onChangeText={onChange}
                  value={value}
                />
                {errors.phone && <Text className="text-red-400 mt-1 ml-1">{errors.phone.message}</Text>}
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            className="bg-purple py-4 rounded-2xl items-center shadow-lg shadow-purple/50 mt-4"
          >
            <Text className="text-white text-lg font-semibold">Send OTP</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-textSecondary">New to AgriNex? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text className="text-emerald font-semibold">Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
