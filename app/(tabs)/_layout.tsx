import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { 
  LayoutDashboard, 
  Users, 
  Scan, 
  MessageCircle, 
  User,
} from 'lucide-react-native';
import { View, StyleSheet, Dimensions, TouchableOpacity, Keyboard, ActivityIndicator, Text } from 'react-native';
import Colors from '../../constants/Colors';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width } = Dimensions.get('window');

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class NavigationErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  public static getDerivedStateFromError(_: Error): ErrorBoundaryState { return { hasError: true }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NavigationErrorBoundary]', error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <View style={[errorStyles.container, { backgroundColor: '#071824' }]}>
          <ActivityIndicator size="large" color="#00D26A" />
          <Text style={[errorStyles.title, { color: '#FFFFFF' }]}>Navigation Initializing...</Text>
          <Text style={[errorStyles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}>Establishing a secure connection to the main dashboard.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const TabBarIcon = ({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) => (
  <View style={styles.tabIconContainer}>
    <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
  </View>
);

export default function TabLayout() {
  return (
    <NavigationErrorBoundary>
      <SafeTabLayout />
    </NavigationErrorBoundary>
  );
}

function SafeTabLayout() {
  const { isDarkMode, theme } = useAppTheme();
  const pathname = usePathname();

  let navigation: any = null;
  try { navigation = useNavigation(); } catch (err) {}

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (!navigation) {
    return (
      <View style={[errorStyles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#00D26A" />
        <Text style={[errorStyles.title, { color: theme.text }]}>
          Navigation Initializing...
        </Text>
      </View>
    );
  }

  const isScanning = pathname === '/scan';
  const shouldHideTabBar = isScanning || keyboardVisible;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: {
          position: 'absolute',
          bottom: 18,
          left: 16,
          right: 16,
          height: 72,
          borderRadius: 40,
          backgroundColor: theme.card,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDarkMode ? 0.25 : 0.08,
          shadowRadius: 12,
          elevation: 10,
          borderTopWidth: 0,
          display: shouldHideTabBar ? 'none' : 'flex',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          height: 72,
        },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={LayoutDashboard} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={Users} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarButton: (props: any) => (
            <TouchableOpacity
              onPress={props.onPress ?? undefined}
              activeOpacity={0.85}
              style={{ top: -20, justifyContent: 'center', alignItems: 'center', flex: 1 }}
            >
              <View style={[styles.scanButtonOuter, { shadowColor: theme.primary }]}>
                <View style={[styles.scanButton, { backgroundColor: theme.primary, borderColor: theme.card }]}>
                  <Scan size={24} color="white" strokeWidth={2.5} />
                </View>
              </View>
            </TouchableOpacity>
          ),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Hidden screens (no tab bar entry) ── */}
      <Tabs.Screen name="create-post" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  scanButtonOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
