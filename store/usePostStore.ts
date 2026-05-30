import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

interface Comment {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  user: {
    full_name: string;
    profile_picture: string | null;
  };
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url?: string;
  images?: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
  author_name?: string;
  author_avatar?: string;
  user?: {
    full_name: string;
    profile_picture: string | null;
  };
}

interface PostState {
  posts: Post[];
  userPosts: Post[];
  savedPosts: Post[];
  savedPostIds: number[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  fetchSavedPosts: () => Promise<void>;
  fetchUserPosts: () => Promise<void>;
  createPost: (content: string, image?: string, images?: string[]) => Promise<void>;
  likePost: (postId: number) => Promise<void>;
  toggleSavePost: (postId: number) => Promise<void>;
  editPost: (postId: number, content: string) => Promise<void>;
  deletePost: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string) => Promise<void>;
  fetchComments: (postId: number) => Promise<Comment[]>;
  clearError: () => void;
  clearCache: () => void;
}

/** Convert any error to a friendly user-facing message */
const getFriendlyError = (error: any, context: string): string => {
  if (error?.code === 'ECONNABORTED') {
    return `Request timed out. Please check your connection and try again.`;
  }
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return `Unable to connect to the server. Please check your internet connection and try again.`;
  }
  if (error?.response?.status === 401) {
    return `Your session has expired. Please log in again.`;
  }
  if (error?.response?.status === 404) {
    return `${context} not found. It may have been removed.`;
  }
  if (error?.response?.status >= 500) {
    return `Server error. Please try again later.`;
  }
  return `Unable to ${context.toLowerCase()}. Please try again.`;
};

export const usePostStore = create<PostState>()(
  persist(
    (set, get) => ({
      posts: [],
      userPosts: [],
      savedPosts: [],
      savedPostIds: [],
      isLoading: false,
      error: null,
      clearError: () => set({ error: null }),
      clearCache: () => set({ posts: [], userPosts: [], savedPosts: [], savedPostIds: [], isLoading: false, error: null }),
      fetchPosts: async () => {
        set({ isLoading: true, error: null });
        const attemptFetch = async (attempt: number): Promise<void> => {
          try {
            const response = await client.get('/posts');
            const posts = response.data || [];
            const savedIds = posts.filter((p: any) => p.is_saved).map((p: any) => p.id);
            set({ posts, savedPostIds: savedIds, isLoading: false, error: null });
          } catch (error: any) {
            console.warn(`[PostStore] Fetch posts attempt ${attempt} failed:`, error?.message);
            if (attempt < 2) {
              // Auto-retry once after 2 seconds
              await new Promise(r => setTimeout(r, 2000));
              return attemptFetch(attempt + 1);
            }
            set({ 
              isLoading: false,
              error: getFriendlyError(error, 'load community posts')
            });
          }
        };
        await attemptFetch(1);
      },
      fetchSavedPosts: async () => {
        try {
          const response = await client.get('/posts/saved');
          const savedPostsList: Post[] = response.data || [];
          const savedIds = savedPostsList.map((p: any) => p.id);
          set({ savedPosts: savedPostsList, savedPostIds: savedIds });
        } catch (error: any) {
          console.warn('[PostStore] Fetch saved posts failed:', error?.message);
        }
      },
      fetchUserPosts: async () => {
        try {
          const response = await client.get('/posts/user');
          set({ userPosts: response.data || [] });
        } catch (error: any) {
          console.warn('[PostStore] Fetch user posts failed:', error?.message);
        }
      },
      createPost: async (content, image, images) => {
        set({ isLoading: true, error: null });
        try {
          const payload: any = { content };
          if (images && images.length > 0) {
            payload.images = images;
            payload.image_url = images[0];
          } else if (image) {
            payload.image_url = image;
          }
          const response = await client.post('/posts', payload);
          const newPost = response.data;
          set({ 
            posts: [newPost, ...get().posts],
            userPosts: [newPost, ...get().userPosts],
            isLoading: false 
          });
        } catch (error: any) {
          console.warn('[PostStore] Create post failed:', error?.message);
          set({ isLoading: false });
          throw new Error(getFriendlyError(error, 'publish your post'));
        }
      },
      likePost: async (postId) => {
        const previousPosts = get().posts;
        const updatedPosts = previousPosts.map((post) => {
          if (post.id === postId) {
            return { 
              ...post, 
              is_liked: !post.is_liked, 
              likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1 
            };
          }
          return post;
        });
        set({ posts: updatedPosts });

        try {
          const response = await client.post(`/posts/${postId}/like`);
          set({ 
            posts: get().posts.map(p => p.id === postId ? { ...p, likes_count: response.data.likes_count, is_liked: response.data.liked } : p) 
          });
        } catch (error: any) {
          console.warn('[PostStore] Like post failed:', error?.message);
          set({ posts: previousPosts });
        }
      },
      toggleSavePost: async (postId: number) => {
        const previousSavedIds = get().savedPostIds;
        const previousSavedPosts = get().savedPosts;
        const isSaved = previousSavedIds.includes(postId);
        const targetPost = get().posts.find(p => p.id === postId);
        
        // Optimistic Update
        if (isSaved) {
          set({
            savedPostIds: previousSavedIds.filter(id => id !== postId),
            savedPosts: previousSavedPosts.filter(p => p.id !== postId),
          });
        } else {
          set({
            savedPostIds: [...previousSavedIds, postId],
            savedPosts: targetPost ? [...previousSavedPosts, { ...targetPost, is_saved: true }] : previousSavedPosts,
          });
        }
        
        set({
          posts: get().posts.map(p => p.id === postId ? { ...p, is_saved: !isSaved } : p)
        });

        try {
          const response = await client.post(`/posts/${postId}/save`);
          const savedStatus = response.data.saved;
          const currentSavedIds = get().savedPostIds.filter(id => id !== postId);
          if (savedStatus) {
            const postToAdd = get().posts.find(p => p.id === postId);
            set({
              savedPostIds: [...currentSavedIds, postId],
              savedPosts: postToAdd
                ? [...get().savedPosts.filter(p => p.id !== postId), { ...postToAdd, is_saved: true }]
                : get().savedPosts,
            });
          } else {
            set({
              savedPostIds: currentSavedIds,
              savedPosts: get().savedPosts.filter(p => p.id !== postId),
            });
          }
          set({
            posts: get().posts.map(p => p.id === postId ? { ...p, is_saved: savedStatus } : p)
          });
        } catch (error: any) {
          console.warn('[PostStore] Toggle save post failed:', error?.message);
          set({ savedPostIds: previousSavedIds, savedPosts: previousSavedPosts });
          set({
            posts: get().posts.map(p => p.id === postId ? { ...p, is_saved: isSaved } : p)
          });
        }
      },
      editPost: async (postId, content) => {
        try {
          const response = await client.put(`/posts/${postId}`, { content });
          const updatedPost = response.data;
          set({
            posts: get().posts.map(p => p.id === postId ? updatedPost : p),
            userPosts: get().userPosts.map(p => p.id === postId ? updatedPost : p)
          });
        } catch (error: any) {
          console.warn('[PostStore] Edit post failed:', error?.message);
          throw new Error(getFriendlyError(error, 'update this post'));
        }
      },
      deletePost: async (postId) => {
        try {
          await client.delete(`/posts/${postId}`);
          set({ 
            posts: get().posts.filter((post) => post.id !== postId),
            userPosts: get().userPosts.filter((post) => post.id !== postId),
            savedPosts: get().savedPosts.filter((post) => post.id !== postId),
            savedPostIds: get().savedPostIds.filter((id) => id !== postId)
          });
        } catch (error: any) {
          console.warn('[PostStore] Delete post failed:', error?.message);
        }
      },
      addComment: async (postId, content) => {
        try {
          await client.post(`/posts/${postId}/comments`, { content });
          set({
            posts: get().posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)
          });
        } catch (error: any) {
          console.warn('[PostStore] Add comment failed:', error?.message);
          throw new Error(getFriendlyError(error, 'post your comment'));
        }
      },
      fetchComments: async (postId) => {
        try {
          const response = await client.get(`/posts/${postId}/comments`);
          return response.data;
        } catch (error: any) {
          console.warn('[PostStore] Fetch comments failed:', error?.message);
          return [];
        }
      }
    }),
    {
      name: 'agrinex-post-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ savedPostIds: state.savedPostIds, savedPosts: state.savedPosts }),
    }
  )
);
