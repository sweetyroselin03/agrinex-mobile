import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'error' | 'success';
  onHide: () => void;
}

export default function Toast({ visible, message, type = 'error', onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const isError = type === 'error';
  const bgColor = isError ? '#FEF2F2' : '#F0FDF4';
  const borderColor = isError ? '#F87171' : '#4ADE80';
  const textColor = isError ? '#991B1B' : '#166534';
  const Icon = isError ? AlertCircle : CheckCircle2;
  const iconColor = isError ? '#DC2626' : '#16A34A';

  return (
    <Animated.View 
      entering={FadeInUp.duration(400).springify()} 
      exiting={FadeOutUp.duration(300)}
      style={[styles.container, { backgroundColor: bgColor, borderColor }]}
    >
      <View style={styles.content}>
        <Icon color={iconColor} size={24} style={styles.icon} />
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
        <TouchableOpacity onPress={onHide} style={styles.closeBtn}>
          <X color={textColor} size={20} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
