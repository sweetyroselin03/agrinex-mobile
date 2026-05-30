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
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Keyboard, ActivityIndicator, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView, MotiText } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import { useThemeStore } from '../../store/useThemeStore';

const { width } = Dimensions.get('window');

// Global fallback style for error safety
const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1220', // Sleek dark mode background
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
  }
});

// Fallback Error Boundary to intercept navigation crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class NavigationErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NavigationErrorBoundary] Caught navigation error:', error, errorInfo);
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

const TabBarIcon = ({ Icon, color, focused }: any) => {
  return (
    <View style={styles.tabIconContainer}>
      <Icon size={26} color={color} strokeWidth={focused ? 2.5 : 2} />
      {focused && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#10B981',
            marginTop: 4,
          }}
        />
      )}
    </View>
  );
};

export default function TabLayout() {
  return (
    <NavigationErrorBoundary>
      <SafeTabLayout />
    </NavigationErrorBoundary>
  );
}

function SafeTabLayout() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const pathname = usePathname();
  const router = useRouter();
  
  // Safe useNavigation hook call. If it throws outside navigation context, the boundary will catch it.
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch (err) {
    console.warn('[TabLayout] useNavigation not ready:', err);
  }

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Keyboard is imported safely from react-native now
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Safe navigation state listener implementation
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') {
      console.log('[TabLayout] Navigation listener skipped safely: navigation object or addListener is undefined.');
      return;
    }

    // Attach listener with optional chaining guard
    const unsubscribe = navigation.addListener ? navigation.addListener('state', (e: any) => {
      console.log('[TabLayout] Navigation state changed');
    }) : undefined;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  // Loading Fallback Screen if navigation is initializing
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

  // Hide tab bar on scan screen or when keyboard is open
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
          height: 82,
          borderRadius: 40,
          backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 10,
          borderTopWidth: 0,
          display: shouldHideTabBar ? 'none' : 'flex',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 8,
        },
      }}
    >
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
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.9}
              style={{
                top: -22,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            />
          ),
          tabBarIcon: () => (
            <View style={[styles.scanButtonOuter]}>
              <View style={[styles.scanButton, { borderColor: isDarkMode ? '#1e293b' : '#ECFDF5' }]}>
                <Scan size={26} color="white" strokeWidth={2.5} />
              </View>
            </View>
          ),
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#ECFDF5',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
});


