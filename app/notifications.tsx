import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Zap,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  BellOff
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import Colors from '../constants/Colors';
import { useThemeStore } from '../store/useThemeStore';

const { width } = Dimensions.get('window');

const NOTIFICATIONS = [
  {
    id: '1',
    type: 'like',
    user: 'Farmer Rahul',
    content: 'liked your post about organic wheat.',
    time: '2m ago',
    read: false,
    icon: Heart,
    iconColor: '#EF4444'
  },
  {
    id: '2',
    type: 'comment',
    user: 'Expert Amit',
    content: 'commented on your crop scan: "Great progress!"',
    time: '1h ago',
    read: false,
    icon: MessageCircle,
    iconColor: '#3B82F6'
  },
  {
    id: '3',
    type: 'follow',
    user: 'Green Agrotech',
    content: 'started following you.',
    time: '3h ago',
    read: true,
    icon: UserPlus,
    iconColor: '#10B981'
  },
  {
    id: '4',
    type: 'alert',
    user: 'AgriNex AI',
    content: 'Weather alert: Heavy rain expected in Maharashtra.',
    time: '5h ago',
    read: true,
    icon: Zap,
    iconColor: '#F59E0B'
  },
  {
    id: '5',
    type: 'like',
    user: 'Priya S.',
    content: 'liked your comment.',
    time: '1d ago',
    read: true,
    icon: Heart,
    iconColor: '#EF4444'
  }
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? (Colors?.dark || Colors?.light) : Colors?.light;
  if (!theme) return null; // Prevent crash

  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.background }]}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <CheckCircle2 color={theme.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        <AnimatePresence>
          {notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <MotiView
                key={notif.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: index * 100 }}
                style={[
                  styles.notifCard, 
                  { backgroundColor: theme.card, borderColor: theme.border },
                  !notif.read && { borderLeftWidth: 4, borderLeftColor: theme.primary }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.mint }]}>
                  <notif.icon color={notif.iconColor} size={20} fill={notif.type === 'like' ? notif.iconColor : 'transparent'} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifText, { color: theme.text }]}>
                    <Text style={styles.userName}>{notif.user}</Text> {notif.content}
                  </Text>
                  <Text style={[styles.notifTime, { color: theme.textLight }]}>{notif.time}</Text>
                </View>
                {!notif.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
              </MotiView>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.mint }]}>
                <BellOff color={theme.primary} size={48} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>You don't have any new notifications right now.</Text>
            </View>
          )}
        </AnimatePresence>

        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Trash2 color={theme.error} size={18} />
            <Text style={[styles.clearBtnText, { color: theme.error }]}>Clear all notifications</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
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
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 24,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  userName: {
    fontWeight: '800',
  },
  notifTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
    paddingVertical: 12,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
