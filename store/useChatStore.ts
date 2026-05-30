import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export interface ChatMessage {
  id: number;
  user_id: number;
  conversation_id: string;
  message: string;
  is_ai: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConversations: () => Promise<void>;
  startNewConversation: () => string;
  setActiveConversation: (id: string | null) => void;
  loadConversationMessages: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      error: null,

      fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await client.get('/chat/conversations');
          const remoteConvs = response.data || [];
          
          const currentLocal = get().conversations;
          const merged: Conversation[] = remoteConvs.map((remote: any) => {
            const local = currentLocal.find(c => c.id === remote.id);
            return {
              id: remote.id,
              title: remote.title || 'Agri Chat',
              preview: remote.preview || '',
              messages: local ? local.messages : [],
              created_at: remote.created_at,
              updated_at: remote.updated_at || remote.created_at,
            };
          });

          // Add any local conversations that haven't synced yet (or are mock)
          currentLocal.forEach(local => {
            if (!merged.find(m => m.id === local.id)) {
              merged.push(local);
            }
          });

          set({ conversations: merged, isLoading: false });
        } catch (error) {
          console.error('Fetch conversations failed', error);
          set({ isLoading: false });
        }
      },

      startNewConversation: () => {
        const newId = `conv_${Date.now()}`;
        const newConv: Conversation = {
          id: newId,
          title: 'New Chat',
          preview: 'Start a new conversation...',
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({
          conversations: [newConv, ...get().conversations],
          activeConversationId: newId,
        });

        return newId;
      },

      setActiveConversation: (id: string | null) => {
        set({ activeConversationId: id });
        if (id) {
          get().loadConversationMessages(id);
        }
      },

      loadConversationMessages: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await client.get(`/chat/history`, {
            params: { conversation_id: id }
          });
          const messages = response.data || [];
          
          set({
            conversations: get().conversations.map(c => 
              c.id === id ? { ...c, messages } : c
            ),
            isLoading: false
          });
        } catch (error) {
          console.error('Load messages failed', error);
          set({ isLoading: false });
        }
      },

      sendMessage: async (text: string) => {
        let activeId = get().activeConversationId;
        if (!activeId) {
          activeId = get().startNewConversation();
        }

        const currentConv = get().conversations.find(c => c.id === activeId);
        if (!currentConv) return;

        // Create temporary user message for optimistic UI update
        const tempUserMsg: ChatMessage = {
          id: -(Date.now()),
          user_id: 0,
          conversation_id: activeId,
          message: text,
          is_ai: false,
          created_at: new Date().toISOString()
        };

        const updatedMessages = [...currentConv.messages, tempUserMsg];

        set({
          conversations: get().conversations.map(c => 
            c.id === activeId ? {
              ...c,
              messages: updatedMessages,
              preview: text.substring(0, 60),
              updated_at: new Date().toISOString()
            } : c
          )
        });

        set({ isLoading: true });

        try {
          const response = await client.post('/ai/chat', {
            message: text,
            conversation_id: activeId
          });
          
          // The backend returns the saved user/AI message objects or AI reply directly.
          // Let's reload messages from backend to ensure absolute synchronization.
          await get().loadConversationMessages(activeId);
          await get().fetchConversations();
        } catch (error) {
          console.error('Send chat failed', error);
          // Remove optimistic message if failed
          set({
            conversations: get().conversations.map(c => 
              c.id === activeId ? {
                ...c,
                messages: c.messages.filter(m => m.id !== tempUserMsg.id)
              } : c
            ),
            isLoading: false
          });
        }
      },

      deleteConversation: async (id: string) => {
        const previousConvs = get().conversations;
        
        // Optimistic delete
        set({
          conversations: previousConvs.filter(c => c.id !== id),
          activeConversationId: get().activeConversationId === id ? null : get().activeConversationId
        });

        try {
          await client.delete(`/chat/conversation/${id}`);
        } catch (error) {
          console.error('Delete conversation failed', error);
          // Rollback
          set({ conversations: previousConvs });
        }
      },

      renameConversation: async (id: string, newTitle: string) => {
        const previousConvs = get().conversations;

        // Optimistic rename
        set({
          conversations: previousConvs.map(c => 
            c.id === id ? { ...c, title: newTitle } : c
          )
        });

        try {
          await client.put(`/chat/conversation/${id}/title`, {
            message: newTitle
          });
        } catch (error) {
          console.error('Rename conversation failed', error);
          // Rollback
          set({ conversations: previousConvs });
        }
      },

      clearChat: () => {
        set({ conversations: [], activeConversationId: null, error: null });
      },

      clearCache: () => {
        set({ conversations: [], activeConversationId: null, error: null, isLoading: false });
      },
    }),
    {
      name: 'agrinex-chat-storage-v4',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ conversations: state.conversations }),
    }
  )
);
