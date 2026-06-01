import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../hooks/useAppTheme';
import shadows from '../theme/shadows';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

export default function AppButton({
  title,
  loading = false,
  variant = 'primary',
  style,
  disabled,
  ...props
}: AppButtonProps) {
  const { isDarkMode, theme: colors } = useAppTheme();
  const isButtonDisabled = disabled || loading;

  const getTextColor = () => {
    if (variant === 'outline') return colors.primary;
    if (variant === 'secondary') return isDarkMode ? '#FFFFFF' : '#0F172A';
    return '#FFFFFF';
  };

  const getButtonContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
            },
          ]}
        >
          {title}
        </Text>
      )}
    </>
  );

  if (variant === 'primary' || variant === 'secondary') {
    const gradientColors: [string, string] =
      variant === 'primary'
        ? [colors.primary, colors.secondary]
        : isDarkMode
        ? ['#0F2636', '#071824']
        : ['#F1F5F9', '#E2E8F0'];

    return (
      <TouchableOpacity
        style={[
          styles.button,
          isButtonDisabled && styles.disabled,
          variant === 'primary' && styles.shadow,
          style,
        ]}
        disabled={isButtonDisabled}
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {getButtonContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: variant === 'danger' ? colors.error : 'transparent',
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        isButtonDisabled && styles.disabled,
        style,
      ]}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {getButtonContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    height: 54,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
  shadow: {
    ...shadows.glow,
  },
});
