import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import shadows from '../theme/shadows';

interface AppCardProps extends ViewProps {
  variant?: 'default' | 'surface' | 'glass';
  withBorder?: boolean;
  withShadow?: boolean;
}

export default function AppCard({
  children,
  style,
  variant = 'default',
  withBorder = true,
  withShadow = true,
  ...props
}: AppCardProps) {
  const { theme: colors } = useAppTheme();

  const getCardBg = () => {
    switch (variant) {
      case 'surface':
        return colors.surface;
      case 'glass':
        return colors.glass;
      case 'default':
      default:
        return colors.card;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getCardBg(),
          borderColor: withBorder ? colors.border : 'transparent',
          borderWidth: withBorder ? 1 : 0,
        },
        withShadow && styles.shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
  },
  shadow: {
    ...shadows.md,
  },
});
