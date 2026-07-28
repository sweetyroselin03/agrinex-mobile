import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export interface Participant {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  profile_picture?: string;
  is_verified?: boolean;
  is_online?: boolean;
}

export interface Attachment {
  id: number;
  url: string;
  file_type?: string;
}

export interface Reaction {
  id: number;
  emoji: string;
  user_id: number;
}

export interface DirectMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  sender_picture?: string;
  content?: string;
  status?: string;
  created_at: string;
  is_edited?: boolean;
  is_deleted_everyone?: boolean;
  reply_to_id?: number;
  reply_to_content?: string;
  reply_to_sender?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface DirectConversation {
  id: number;
  other_participant?: Participant;
  unread_count: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
  last_message?: DirectMessage | null;
  created_at: string;
  updated_at: string;
}

export interface BlockStatus {
  is_blocked: boolean;
  blocked_by_me: boolean;
  blocked_by_them: boolean;
}

interface DirectChatState {
  conversations: DirectConversation[];
  activeConversationId: number | null;
  messages: Record<number, DirectMessage[]>;
  typingUsers: Record<number, string[]>;
  blockStatusMap: Record<number, BlockStatus>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  
  // WebSockets
  socket: WebSocket | null;

  // Actions
  fetchConversations: () => Promise<void>;
  startConversation: (targetUserId: number) => Promise<number | null>;
  selectConversation: (conversationId: number) => Promise<void>;
  sendMessage: (conversationId: number, content?: string, attachments?: string[], replyToId?: number) => Promise<void>;
  editMessage: (messageId: number, newContent: string) => Promise<void>;
  deleteMessage: (messageId: number, deleteType: 'for_me' | 'everyone') => Promise<void>;
  toggleReaction: (messageId: number, emoji: string) => Promise<void>;
  pinConversation: (conversationId: number) => Promise<void>;
  muteConversation: (conversationId: number) => Promise<void>;
  archiveConversation: (conversationId: number) => Promise<void>;
  fetchBlockStatus: (targetUserId: number) => Promise<BlockStatus>;
  blockUser: (targetUserId: number) => Promise<void>;
  unblockUser: (targetUserId: number) => Promise<void>;
  uploadMedia: (fileUri: string) => Promise<string>;
  connectWebSocket: (userId: number) => void;
  disconnectWebSocket: () => void;
  sendTypingSignal: (conversationId: number, isTyping: boolean, username: string) => void;
}

export const useDirectChatStore = create<DirectChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      messages: {},
      typingUsers: {},
      blockStatusMap: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      socket: null,

      fetchConversations: async () => {
        set({ isLoadingConversations: true });
        try {
          const res = await client.get('/conversations');
          set({ conversations: res.data || [], isLoadingConversations: false });
        } catch (err) {
          console.log('[DirectChatStore] fetchConversations failed:', err);
          set({ isLoadingConversations: false });
        }
      },

      startConversation: async (targetUserId: number) => {
        try {
          const res = await client.post(`/conversations?target_user_id=${targetUserId}`);
          const conv = res.data;
          await get().fetchConversations();
          set({ activeConversationId: conv.id });
          await get().selectConversation(conv.id);
          return conv.id;
        } catch (err) {
          console.log('[DirectChatStore] startConversation failed:', err);
          return null;
        }
      },

      selectConversation: async (conversationId: number) => {
        set({ activeConversationId: conversationId });
        if (!conversationId) return;

        set({ isLoadingMessages: true });
        try {
          const res = await client.get(`/conversations/${conversationId}/messages`);
          const msgList = res.data || [];
          set((state) => ({
            messages: { ...state.messages, [conversationId]: msgList },
            isLoadingMessages: false,
            conversations: state.conversations.map((c) =>
              c.id === conversationId ? { ...c, unread_count: 0 } : c
            ),
          }));
        } catch (err) {
          console.log('[DirectChatStore] selectConversation failed:', err);
          set({ isLoadingMessages: false });
        }
      },

      sendMessage: async (conversationId: number, content?: string, attachments?: string[], replyToId?: number) => {
        try {
          const payload = {
            content,
            attachments: attachments || [],
            reply_to_id: replyToId,
          };
          const res = await client.post(`/conversations/${conversationId}/messages`, payload);
          const newMsg = res.data;

          set((state) => {
            const currentMsgs = state.messages[conversationId] || [];
            return {
              messages: {
                ...state.messages,
                [conversationId]: [...currentMsgs, newMsg],
              },
            };
          });

          await get().fetchConversations();
        } catch (err) {
          console.log('[DirectChatStore] sendMessage failed:', err);
          throw err;
        }
      },

      editMessage: async (messageId: number, newContent: string) => {
        try {
          const res = await client.put(`/messages/${messageId}`, { content: newContent });
          const updatedMsg = res.data;

          set((state) => {
            const activeId = state.activeConversationId;
            if (!activeId) return state;
            const msgs = state.messages[activeId] || [];
            return {
              messages: {
                ...state.messages,
                [activeId]: msgs.map((m) => (m.id === messageId ? updatedMsg : m)),
              },
            };
          });
        } catch (err) {
          console.log('[DirectChatStore] editMessage failed:', err);
        }
      },

      deleteMessage: async (messageId: number, deleteType: 'for_me' | 'everyone') => {
        try {
          await client.delete(`/messages/${messageId}?delete_type=${deleteType}`);
          set((state) => {
            const activeId = state.activeConversationId;
            if (!activeId) return state;
            const msgs = state.messages[activeId] || [];
            if (deleteType === 'everyone') {
              return {
                messages: {
                  ...state.messages,
                  [activeId]: msgs.map((m) =>
                    m.id === messageId ? { ...m, is_deleted_everyone: true, content: '' } : m
                  ),
                },
              };
            } else {
              return {
                messages: {
                  ...state.messages,
                  [activeId]: msgs.filter((m) => m.id !== messageId),
                },
              };
            }
          });
        } catch (err) {
          console.log('[DirectChatStore] deleteMessage failed:', err);
        }
      },

      toggleReaction: async (messageId: number, emoji: string) => {
        try {
          const res = await client.post(`/messages/${messageId}/reactions`, { emoji });
          const updatedReactions = res.data;

          set((state) => {
            const activeId = state.activeConversationId;
            if (!activeId) return state;
            const msgs = state.messages[activeId] || [];
            return {
              messages: {
                ...state.messages,
                [activeId]: msgs.map((m) =>
                  m.id === messageId ? { ...m, reactions: updatedReactions } : m
                ),
              },
            };
          });
        } catch (err) {
          console.log('[DirectChatStore] toggleReaction failed:', err);
        }
      },

      pinConversation: async (conversationId: number) => {
        try {
          const res = await client.post(`/conversations/${conversationId}/pin`);
          const isPinned = res.data.is_pinned;
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === conversationId ? { ...c, is_pinned: isPinned } : c
            ),
          }));
        } catch (err) {
          console.log('[DirectChatStore] pinConversation failed:', err);
        }
      },

      muteConversation: async (conversationId: number) => {
        try {
          const res = await client.post(`/conversations/${conversationId}/mute`);
          const isMuted = res.data.is_muted;
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === conversationId ? { ...c, is_muted: isMuted } : c
            ),
          }));
        } catch (err) {
          console.log('[DirectChatStore] muteConversation failed:', err);
        }
      },

      archiveConversation: async (conversationId: number) => {
        try {
          const res = await client.post(`/conversations/${conversationId}/archive`);
          const isArchived = res.data.is_archived;
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === conversationId ? { ...c, is_archived: isArchived } : c
            ),
          }));
        } catch (err) {
          console.log('[DirectChatStore] archiveConversation failed:', err);
        }
      },

      fetchBlockStatus: async (targetUserId: number) => {
        try {
          const res = await client.get(`/users/${targetUserId}/block-status`);
          const status: BlockStatus = res.data;
          set((state) => ({
            blockStatusMap: { ...state.blockStatusMap, [targetUserId]: status },
          }));
          return status;
        } catch (err) {
          const fallback = { is_blocked: false, blocked_by_me: false, blocked_by_them: false };
          return fallback;
        }
      },

      blockUser: async (targetUserId: number) => {
        try {
          await client.post(`/users/${targetUserId}/block`);
          await get().fetchBlockStatus(targetUserId);
        } catch (err) {
          console.log('[DirectChatStore] blockUser failed:', err);
          throw err;
        }
      },

      unblockUser: async (targetUserId: number) => {
        try {
          await client.post(`/users/${targetUserId}/unblock`);
          await get().fetchBlockStatus(targetUserId);
        } catch (err) {
          console.log('[DirectChatStore] unblockUser failed:', err);
          throw err;
        }
      },

      uploadMedia: async (fileUri: string) => {
        const formData = new FormData();
        const filename = fileUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // @ts-ignore
        formData.append('file', { uri: fileUri, name: filename, type });

        const res = await client.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        return res.data.url;
      },

      connectWebSocket: (userId: number) => {
        const existingSocket = get().socket;
        if (existingSocket && existingSocket.readyState === WebSocket.OPEN) return;

        try {
          const baseUrl = client.defaults.baseURL || '';
          const wsHost = baseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
          const wsUrl = `${wsHost}/ws/chat/${userId}`;

          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('[DirectChatStore] WebSocket Connected');
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'new_message') {
                const msg = data.message;
                set((state) => {
                  const convMsgs = state.messages[msg.conversation_id] || [];
                  return {
                    messages: {
                      ...state.messages,
                      [msg.conversation_id]: [...convMsgs, msg],
                    },
                  };
                });
                get().fetchConversations();
              } else if (data.type === 'typing') {
                const { conversation_id, is_typing, username } = data;
                set((state) => {
                  const currentTypers = state.typingUsers[conversation_id] || [];
                  const updated = is_typing
                    ? Array.from(new Set([...currentTypers, username]))
                    : currentTypers.filter((u) => u !== username);

                  return {
                    typingUsers: { ...state.typingUsers, [conversation_id]: updated },
                  };
                });
              }
            } catch (e) {
              console.log('[DirectChatStore] WS parse error:', e);
            }
          };

          ws.onerror = (e) => {
            console.log('[DirectChatStore] WS error:', e);
          };

          ws.onclose = () => {
            console.log('[DirectChatStore] WS closed');
          };

          set({ socket: ws });
        } catch (e) {
          console.log('[DirectChatStore] WS init failed:', e);
        }
      },

      disconnectWebSocket: () => {
        const ws = get().socket;
        if (ws) {
          ws.close();
          set({ socket: null });
        }
      },

      sendTypingSignal: (conversationId: number, isTyping: boolean, username: string) => {
        const ws = get().socket;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'typing',
              conversation_id: conversationId,
              is_typing: isTyping,
              username,
            })
          );
        }
      },
    }),
    {
      name: 'agrinex-direct-chat-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ conversations: state.conversations }),
    }
  )
);
