import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  post_id?: number;
  actor_id?: number;
  actor_name?: string;
  actor_avatar?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  clearLocalCache: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await client.get('/notifications');
      const notifs: Notification[] = res.data || [];
      const unread = notifs.filter(n => !n.is_read).length;
      set({ notifications: notifs, unreadCount: unread, isLoading: false });
    } catch (e: any) {
      console.warn('[NotificationStore] fetchNotifications failed:', e?.message);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await client.get('/notifications/unread-count');
      set({ unreadCount: res.data?.count ?? 0 });
    } catch (e: any) {
      console.warn('[NotificationStore] fetchUnreadCount failed:', e?.message);
    }
  },

  markAllRead: async () => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
    try {
      await client.post('/notifications/read-all');
    } catch (e: any) {
      console.warn('[NotificationStore] markAllRead failed:', e?.message);
    }
  },

  markOneRead: async (id: number) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try {
      await client.post(`/notifications/${id}/read`);
    } catch (e: any) {
      console.warn('[NotificationStore] markOneRead failed:', e?.message);
    }
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      await client.delete('/notifications');
    } catch (e: any) {
      console.warn('[NotificationStore] clearAll failed:', e?.message);
    }
  },

  clearLocalCache: () => {
    set({ notifications: [], unreadCount: 0, isLoading: false });
  },
}));
