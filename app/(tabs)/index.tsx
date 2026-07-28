import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { 
  CloudSun, 
  Droplet, 
  Wind, 
  Sprout, 
  ArrowRight, 
  Bell, 
  Zap,
  Leaf,
  Bug,
  Thermometer,
  Navigation,
  MessageSquare,
  ScanLine,
  Users,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/useAppTheme';
import client from '../../api/client';

import * as Haptics from 'expo-haptics';
import { useDirectChatStore } from '../../store/useDirectChatStore';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDarkMode, theme } = useAppTheme();
  const { conversations, fetchConversations } = useDirectChatStore();

  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unread messages count
  const totalUnread = useMemo(() => {
    return (conversations || []).reduce((acc, c) => acc + (c.unread_count || 0), 0);
  }, [conversations]);

  // Latest message snippet
  const latestMessageSnippet = useMemo(() => {
    if (!conversations || conversations.length === 0) return null;
    const active = conversations.find(c => c.last_message);
    return active?.last_message?.content || null;
  }, [conversations]);

  // Get time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchConversations();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const weatherRes = await client.get('/weather/current');
      setWeather(weatherRes.data);
    } catch (error) {
      console.warn('[Dashboard] Weather fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchConversations()]);
    setRefreshing(false);
  };

  const QuickAction = ({ icon: Icon, label, onPress, color, delay = 0 }: any) => (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <TouchableOpacity style={[styles.actionItem, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
          <Icon color={color} size={24} />
        </View>
        <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.textLight }]}>{greeting},</Text>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{user?.full_name || 'Farmer'} 👋</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
            activeOpacity={0.7}
          >
            <Bell color={theme.text} size={22} />
            <View style={[styles.notifDot, { backgroundColor: theme.error }]} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.headerBtn, styles.msgBtn, { backgroundColor: '#16A34A', borderColor: '#15803D' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/messages');
            }}
            activeOpacity={0.7}
          >
            <MessageSquare color="#FFFFFF" size={22} />
            {totalUnread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
              </View>
            ) : (
              <View style={styles.onlineDot} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Weather Card */}
        <TouchableOpacity onPress={() => router.push('/weather')} activeOpacity={0.85}>
          <Animated.View 
            entering={FadeIn.duration(500)}
            style={[styles.weatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.weatherMain}>
              <View>
                <View style={styles.locationRow}>
                  <Navigation size={12} color={theme.primary} fill={theme.primary} />
                  <Text style={[styles.locationText, { color: theme.textLight }]}>Maharashtra, India</Text>
                </View>
                <Text style={[styles.tempText, { color: theme.text }]}>{weather?.temp || 32}°C</Text>
                <Text style={[styles.conditionText, { color: theme.textLight }]}>{weather?.condition || 'Partly Cloudy'}</Text>
              </View>
              <CloudSun color="#F59E0B" size={64} />
            </View>

            <View style={[styles.weatherStats, { backgroundColor: theme.surface }]}>
              <View style={styles.statItem}>
                <Droplet color="#3B82F6" size={18} />
                <Text style={[styles.statText, { color: theme.text }]}>{weather?.humidity || 45}%</Text>
              </View>
              <View style={styles.statItem}>
                <Wind color="#10B981" size={18} />
                <Text style={[styles.statText, { color: theme.text }]}>{weather?.wind || 12}km/h</Text>
              </View>
              <View style={styles.statItem}>
                <Thermometer color="#F59E0B" size={18} />
                <Text style={[styles.statText, { color: theme.text }]}>High 34°</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Quick Actions removed — functionality accessible via tab bar */}

        {/* Smart Insights */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Farm Insights</Text>
          <TouchableOpacity>
            <Text style={[styles.seeMore, { color: theme.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.insightIcon, { backgroundColor: theme.mint }]}>
            <Zap color={theme.primary} size={24} fill={theme.primary} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>Disease Detection</Text>
            <Text style={[styles.insightDesc, { color: theme.textLight }]}>
              AI-powered scans can detect 50+ crop diseases instantly. Keep your crops healthy.
            </Text>
            <TouchableOpacity style={styles.insightAction} onPress={() => router.push('/(tabs)/scan')}>
              <Text style={[styles.insightActionText, { color: theme.primary }]}>Scan Now</Text>
              <ArrowRight color={theme.primary} size={16} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.insightIcon, { backgroundColor: '#EDE9FE' }]}>
            <MessageSquare color="#8B5CF6" size={24} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>AI Farming Expert</Text>
            <Text style={[styles.insightDesc, { color: theme.textLight }]}>
              Get personalized farming advice in English, Tamil, Telugu, Hindi, or Malayalam.
            </Text>
            <TouchableOpacity style={styles.insightAction} onPress={() => router.push('/(tabs)/chat')}>
              <Text style={[styles.insightActionText, { color: '#8B5CF6' }]}>Ask Now</Text>
              <ArrowRight color="#8B5CF6" size={16} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Community Highlight */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Community Buzz</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
            <Text style={[styles.seeMore, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buzzScroll}>
          {[
            { name: 'Rajesh K.', text: 'Best organic pesticide for wheat farming. Highly recommended neem oil! 🌾', time: '2h ago' },
            { name: 'Priya S.', text: 'My tomato yield increased 30% with drip irrigation. Must try! 🍅', time: '5h ago' },
            { name: 'Arjun M.', text: 'Early blight detected in section B. Applied copper fungicide successfully. 🌿', time: '1d ago' },
          ].map((item, i) => (
            <TouchableOpacity key={i} onPress={() => router.push('/(tabs)/community')} activeOpacity={0.8}>
              <View style={[styles.buzzCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.buzzHeader}>
                  <View style={[styles.buzzAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={styles.buzzAvatarText}>{item.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={[styles.buzzName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.buzzTime, { color: theme.textLight }]}>{item.time}</Text>
                  </View>
                </View>
                <Text style={[styles.buzzText, { color: theme.text }]} numberOfLines={2}>
                  {item.text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  msgBtn: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  weatherCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tempText: {
    fontSize: 42,
    fontWeight: '900',
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  seeMore: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
    width: (width - 48 - 36) / 4,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  insightCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    marginBottom: 16,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buzzScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  buzzCard: {
    width: width * 0.7,
    padding: 20,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 1,
  },
  buzzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  buzzAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buzzAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  buzzName: {
    fontSize: 14,
    fontWeight: '700',
  },
  buzzTime: {
    fontSize: 12,
  },
  buzzText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
