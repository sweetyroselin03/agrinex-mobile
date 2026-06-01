import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  Send,
  User as UserIcon,
  MapPin,
  MoreVertical
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { usePostStore } from '../../store/usePostStore';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const { posts, likePost, fetchComments, addComment } = usePostStore();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const foundPost = posts.find(p => p.id.toString() === id);
    if (foundPost) {
      setPost(foundPost);
      loadComments();
    }
  }, [id, posts]);

  const loadComments = async () => {
    try {
      const fetched = await fetchComments(Number(id));
      setComments(fetched);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await addComment(Number(id), newComment);
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (!post) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Post</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MoreVertical color={theme.text} size={20} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Post Header */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              {post.user?.profile_picture ? (
                <Image source={{ uri: post.user.profile_picture }} style={styles.avatarImage} />
              ) : (
                <UserIcon color="white" size={20} />
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.text }]}>{post.user?.full_name || 'Agri Farmer'}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={theme.textLight} />
                <Text style={[styles.locationText, { color: theme.textLight }]}>{post.location || 'Maharashtra, India'}</Text>
              </View>
            </View>
            <Text style={[styles.timeText, { color: theme.textLight }]}>2h ago</Text>
          </View>

          {/* Post Content */}
          <Text style={[styles.postText, { color: theme.text }]}>{post.content}</Text>
          
          {post.image_url && (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
            </View>
          )}

          {/* Actions Bar */}
          <View style={[styles.actionBar, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
            <TouchableOpacity style={styles.actionItem} onPress={() => likePost(post.id)}>
              <Heart color={post.is_liked ? theme.error : theme.textLight} fill={post.is_liked ? theme.error : 'transparent'} size={24} />
              <Text style={[styles.actionLabel, { color: theme.textLight }]}>{post.likes_count || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <MessageCircle color={theme.textLight} size={24} />
              <Text style={[styles.actionLabel, { color: theme.textLight }]}>{post.comments_count || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Share2 color={theme.textLight} size={24} />
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Comments ({comments.length})</Text>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={[styles.emptyText, { color: theme.textLight }]}>No comments yet. Be the first to join the conversation!</Text>
              </View>
            ) : (
              comments.map((comment, idx) => (
                <MotiView 
                  key={comment.id || idx}
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: idx * 100 }}
                  style={styles.commentItem}
                >
                  <View style={[styles.smallAvatar, { backgroundColor: theme.primary }]}>
                    {comment.user?.profile_picture ? (
                      <Image source={{ uri: comment.user.profile_picture }} style={styles.avatarImage} />
                    ) : (
                      <UserIcon color="white" size={14} />
                    )}
                  </View>
                  <View style={[styles.commentBubble, { backgroundColor: isDarkMode ? '#1e293b' : '#F1F5F9' }]}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentAuthor, { color: theme.text }]}>{comment.user?.full_name || 'Agri User'}</Text>
                      <Text style={[styles.commentTime, { color: theme.textLight }]}>1h ago</Text>
                    </View>
                    <Text style={[styles.commentText, { color: theme.text }]}>{comment.content}</Text>
                  </View>
                </MotiView>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.textLight}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: theme.primary }, !newComment.trim() && { opacity: 0.5 }]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="white" /> : <Send color="white" size={18} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 24,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  imageWrapper: {
    width: '100%',
    height: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  actionBar: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentsSection: {
    marginTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentBubble: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
