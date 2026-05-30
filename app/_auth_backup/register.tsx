import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../api/axios';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Invalid phone number'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await api.post('/api/auth/otp/generate', { phone: data.phone });
      router.push({
        pathname: '/otp',
        params: { phone: data.phone, name: data.name }
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
          <Text className="text-white text-3xl font-bold">Join AgriNex</Text>
          <Text className="text-textSecondary text-lg mt-2">Start your smart farming journey</Text>
        </MotiView>

        <View className="mt-10 space-y-6">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="text-textSecondary mb-2 ml-1">Full Name</Text>
                <TextInput
                  placeholder="Arjun Singh"
                  placeholderTextColor="#94A3B8"
                  className="bg-secondary/50 border border-white/10 text-white p-4 rounded-2xl"
                  onChangeText={onChange}
                  value={value}
                />
                {errors.name && <Text className="text-red-400 mt-1 ml-1">{errors.name.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <View className="mt-4">
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
            className="bg-emerald py-4 rounded-2xl items-center shadow-lg shadow-emerald/50 mt-8"
          >
            <Text className="text-white text-lg font-semibold">Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-textSecondary">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text className="text-purple font-semibold">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
