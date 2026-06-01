import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Zap,
  CheckCircle2,
  Trash2,
  BellOff
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNotificationStore } from '../store/useNotificationStore';

const { width } = Dimensions.get('window');

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();
  const {
    notifications,
    fetchNotifications,
    markAllRead,
    markOneRead,
    clearAll,
    isLoading
  } = useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getIconConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case 'like':
        return { icon: Heart, color: '#EF4444', label: 'Like' };
      case 'comment':
        return { icon: MessageCircle, color: '#3B82F6', label: 'Comment' };
      case 'follow':
        return { icon: UserPlus, color: '#00D26A', label: 'Follow' };
      case 'alert':
      default:
        return { icon: Zap, color: '#F59E0B', label: 'Alert' };
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 600);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (_) {
      return 'Recently';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={styles.actionBtn}>
            <CheckCircle2 color={theme.primary} size={22} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <AnimatePresence>
            {notifications.length > 0 ? (
              notifications.map((notif, index) => {
                const config = getIconConfig(notif.type);
                const IconComponent = config.icon;
                return (
                  <MotiView
                    key={notif.id}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 50 }}
                    style={[
                      styles.notifCard, 
                      { backgroundColor: theme.card, borderColor: theme.border },
                      !notif.is_read && { borderLeftWidth: 4, borderLeftColor: theme.primary }
                    ]}
                  >
                    <TouchableOpacity 
                      style={styles.notifMainRow}
                      activeOpacity={0.8}
                      onPress={() => markOneRead(notif.id)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                        <IconComponent color={config.color} size={20} fill={notif.type === 'like' ? config.color : 'transparent'} />
                      </View>
                      <View style={styles.notifContent}>
                        <Text style={[styles.notifText, { color: theme.text }]}>
                          {notif.actor_name ? (
                            <Text style={styles.userName}>{notif.actor_name}</Text>
                          ) : null}
                          {' '}{notif.message}
                        </Text>
                        <Text style={[styles.notifTime, { color: theme.textLight }]}>{formatTime(notif.created_at)}</Text>
                      </View>
                      {!notif.is_read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                    </TouchableOpacity>
                  </MotiView>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#0E241B' : '#E6FBF3' }]}>
                  <BellOff color={theme.primary} size={40} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>You don't have any new notifications right now.</Text>
              </View>
            )}
          </AnimatePresence>
        )}

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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 20,
  },
  loaderContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notifMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    fontSize: 11,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: '800',
  },
});
