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
import { useThemeStore } from '../../store/useThemeStore';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width } = Dimensions.get('window');

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
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
        <View style={errorStyles.container}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={errorStyles.title}>Navigation Initializing...</Text>
          <Text style={errorStyles.subtitle}>Establishing a secure connection to the main dashboard.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const TabBarIcon = ({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) => (
  <View style={styles.tabIconContainer}>
    <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    {focused && <View style={styles.activeDot} />}
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
  const { isDarkMode } = useAppTheme();
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
      <View style={[errorStyles.container, { backgroundColor: isDarkMode ? '#0B1220' : '#F8FAFC' }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={[errorStyles.title, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
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
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          position: 'absolute',
          bottom: 18,
          left: 16,
          right: 16,
          height: 72,
          borderRadius: 40,
          backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
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
              <View style={styles.scanButtonOuter}>
                <View style={[styles.scanButton, { borderColor: isDarkMode ? '#1e293b' : '#ECFDF5' }]}>
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
    backgroundColor: '#10B981',
    marginTop: 3,
  },
  scanButtonOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 16,
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});
