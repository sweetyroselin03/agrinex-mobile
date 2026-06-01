import React from 'react';
import { View, StyleSheet, StatusBar, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';

interface ScreenContainerProps extends ViewProps {
  useSafeArea?: boolean;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

export default function ScreenContainer({
  children,
  style,
  useSafeArea = true,
  edges = ['top', 'bottom'],
  ...props
}: ScreenContainerProps) {
  const { isDarkMode, theme } = useAppTheme();
  const Container = useSafeArea ? SafeAreaView : View;
  const containerProps = useSafeArea ? { edges } : {};

  return (
    <Container style={[styles.container, { backgroundColor: theme.background }, style]} {...containerProps} {...props}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
