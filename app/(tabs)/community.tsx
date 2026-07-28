import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Share,
  Linking,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Plus,
  Search,
  X,
  Camera,
  Image as ImageIcon,
  Send,
  User as UserIcon,
  MapPin,
  ChevronLeft,
  Bookmark,
  Eye,
} from 'lucide-react-native';
import { usePostStore } from '../../store/usePostStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MotiView, AnimatePresence } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CAROUSEL_IMAGE_WIDTH = width - 80;

// ─── Swipeable Image Carousel Component ─────────────────────────────────────
const PostImageCarousel = ({ images, onImagePress }: { images: string[], onImagePress: (images: string[], index: number) => void }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_IMAGE_WIDTH);
    setActiveIdx(idx);
  }, []);

  return (
    <View style={styles.postImageWrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.imageCarousel}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_IMAGE_WIDTH}
        snapToAlignment="start"
      >
        {images.map((img, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onImagePress(images, i)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: img }} style={styles.postImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.imageBadge}>
          <Text style={styles.imageBadgeText}>{activeIdx + 1}/{images.length}</Text>
        </View>
      )}
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

export default function CommunityTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDarkMode, theme } = useAppTheme();

  const { posts, fetchPosts, likePost, createPost, isLoading, error, clearError, addComment, fetchComments, toggleSavePost, savedPostIds, deletePost } = usePostStore();
  const [refreshing, setRefreshing] = useState(false);

  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Fullscreen Image Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    clearError();
    await fetchPosts();
    setRefreshing(false);
  };

  const pickImages = async () => {
    const remaining = 10 - selectedImages.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 10 images per post.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.5,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setSelectedImages(prev => [...prev, ...uris].slice(0, 10));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'AgriNex needs camera access to take photos for your post.');
      return;
    }
    if (selectedImages.length >= 10) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 10 images per post.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
    }
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      return `data:image/${ext};base64,${base64}`;
    } catch {
      return uri;
    }
  };

  const handleShowPreview = () => {
    if (!newPostContent.trim()) return;
    setIsPreviewMode(true);
  };

  const handleBackFromPreview = () => {
    setIsPreviewMode(false);
  };

  const handlePublishPost = async () => {
    if (!newPostContent.trim()) return;
    setIsUploading(true);
    try {
      let imagePayloads: string[] = [];
      if (selectedImages.length > 0) {
        imagePayloads = await Promise.all(selectedImages.map(convertToBase64));
      }
      await createPost(newPostContent, imagePayloads[0], imagePayloads.length > 0 ? imagePayloads : undefined);
      setIsPostModalVisible(false);
      setIsPreviewMode(false);
      setNewPostContent('');
      setSelectedImages([]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.message || 'Failed to publish post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPosts = (posts || []).filter(post => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    const authorName = (post.author_name || post.user?.full_name || '').toLowerCase();
    const content = (post.content || '').toLowerCase();
    const hashtags = ((post as any).hashtags || '').toLowerCase();
    const location = ((post as any).location || '').toLowerCase();
    return authorName.includes(search) || content.includes(search) || hashtags.includes(search) || location.includes(search);
  });

  const handleSharePost = async (post: any) => {
    try {
      const message = `${post.content}\n\n🌱 Shared from AgriNex - Smart Farming Community`;
      await Share.share({
        message,
        title: 'AgriNex Post',
      });
    } catch (e) { console.error(e); }
  };

  const renderPost = (post: any, index: number) => {
    const postImages: string[] = (post.images && post.images.length > 0) ? post.images : (post.image_url ? [post.image_url] : []);

    return (
      <MotiView
        key={post.id || index}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 100 }}
        style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => {
              if (post.user_id && post.user_id !== user?.id) {
                router.push(`/user/${post.user_id}` as any);
              } else {
                router.push('/(tabs)/profile');
              }
            }}
          >
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              {post.author_avatar ? (
                <Image source={{ uri: post.author_avatar }} style={styles.avatarImage} />
              ) : (
                <UserIcon color="white" size={20} />
              )}
            </View>
            <View>
              <Text style={[styles.authorName, { color: theme.text }]}>{post.author_name || 'Agri Farmer'}</Text>
              <View style={styles.locationContainer}>
                <MapPin size={12} color={theme.textLight} />
                <Text style={[styles.postTime, { color: theme.textLight }]}>{post.location || 'Maharashtra, India'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity>
            <MoreVertical color={theme.textLight} size={20} />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)}>
          <Text style={[styles.postText, { color: theme.text }]}>{post.content}</Text>
        </TouchableOpacity>

        {postImages.length > 0 && (
          <PostImageCarousel
            images={postImages}
            onImagePress={(imgs, idx) => {
              setViewerImages(imgs);
              setViewerIndex(idx);
              setViewerVisible(true);
            }}
          />
        )}

        {/* Post Footer */}
        <View style={[styles.postFooter, { borderTopColor: theme.border }]}>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => likePost(post.id)}
              style={[styles.actionButton, post.is_liked && { backgroundColor: isDarkMode ? '#451a1a' : '#FEE2E2' }]}
            >
              <Heart
                color={post.is_liked ? theme.error : theme.textLight}
                size={20}
                fill={post.is_liked ? theme.error : 'transparent'}
              />
              <Text style={[styles.actionText, { color: theme.textLight }, post.is_liked && { color: theme.error }]}>
                {post.likes_count || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/post/${post.id}`)}
            >
              <MessageCircle color={theme.textLight} size={20} />
              <Text style={[styles.actionText, { color: theme.textLight }]}>{post.comments_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePost(post)}>
              <Share2 color={theme.textLight} size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.footerRight}>
            {post.user_id === user?.id && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Alert.alert('Delete Post', 'Remove this post permanently?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.id) }
                  ]);
                }}
              >
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, savedPostIds.includes(post.id) && { backgroundColor: isDarkMode ? '#1e3a2e' : '#ECFDF5' }]}
              onPress={() => toggleSavePost(post.id)}
              activeOpacity={0.7}
            >
              <Bookmark
                color={savedPostIds.includes(post.id) ? theme.primary : theme.textLight}
                size={20}
                fill={savedPostIds.includes(post.id) ? theme.primary : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </MotiView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AgriNex Community</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textLight }]}>Connect with expert farmers</Text>
        </View>
        <TouchableOpacity
          style={[styles.plusButton, { backgroundColor: theme.primary }]}
          onPress={() => setIsPostModalVisible(true)}
        >
          <Plus color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search color={theme.textLight} size={20} />
          <TextInput
            placeholder="Search farmers or posts..."
            placeholderTextColor={theme.textLight}
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={theme.textLight} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error State with Retry */}
      {error && !isLoading && (
        <View style={styles.errorState}>
          <View style={[styles.errorIconBox, { backgroundColor: isDarkMode ? '#451a1a' : '#FEE2E2' }]}>
            <X color={theme.error} size={32} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.text }]}>Something went wrong</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textLight }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={() => { clearError(); fetchPosts(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && !refreshing && posts.length === 0 && (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.emptySubtitle, { color: theme.textLight, marginTop: 16 }]}>Loading community posts...</Text>
        </View>
      )}

      {!error && (isLoading || posts.length > 0 || filteredPosts.length > 0) && (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item, index }) => renderPost(item, index)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                {searchQuery.trim() ? (
                  <>
                    <Search color={theme.textLight} size={64} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No matching farmers or posts</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>Try a different search term</Text>
                  </>
                ) : (
                  <>
                    <MessageCircle color={theme.textLight} size={64} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No community posts yet</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textLight }]}>Be the first to share something!</Text>
                    <TouchableOpacity
                      style={[styles.createFirstBtn, { backgroundColor: theme.primary }]}
                      onPress={() => setIsPostModalVisible(true)}
                    >
                      <Plus color="white" size={20} />
                      <Text style={styles.createFirstText}>Create First Post</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Create Post Modal */}
      <Modal visible={isPostModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {!isPreviewMode ? (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => { setIsPostModalVisible(false); setIsPreviewMode(false); }}>
                    <X color={theme.text} size={24} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Create Post</Text>
                  <TouchableOpacity
                    style={[styles.postSubmitButton, { backgroundColor: theme.primary }, !newPostContent.trim() && { backgroundColor: theme.border }]}
                    onPress={handleShowPreview}
                    disabled={!newPostContent.trim()}
                  >
                    <Eye color="white" size={16} />
                    <Text style={styles.postSubmitText}>Preview</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalUserRow}>
                    <View style={[styles.smallAvatar, { backgroundColor: theme.primary }]}>
                      <UserIcon color="white" size={16} />
                    </View>
                    <Text style={[styles.modalUserName, { color: theme.text }]}>Post as {user?.full_name}</Text>
                  </View>

                  <TextInput
                    placeholder="What's happening in your farm?"
                    placeholderTextColor={theme.textLight}
                    multiline
                    style={[styles.modalInput, { color: theme.text }]}
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                    autoFocus
                  />

                  {selectedImages.length > 0 && (
                    <ScrollView horizontal style={styles.selectedImagesRow} showsHorizontalScrollIndicator={false}>
                      {selectedImages.map((uri, idx) => (
                        <View key={idx} style={styles.selectedImageContainer}>
                          <Image source={{ uri }} style={styles.selectedImage} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <X color="white" size={16} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  {selectedImages.length > 0 && (
                    <Text style={[styles.imageCountText, { color: theme.textLight }]}>{selectedImages.length}/10 images</Text>
                  )}
                </View>

                <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                  <TouchableOpacity style={[styles.modalAction, { backgroundColor: theme.mint }]} onPress={pickImages}>
                    <ImageIcon color={theme.primary} size={24} />
                    <Text style={[styles.modalActionText, { color: theme.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalAction, { backgroundColor: theme.mint }]} onPress={takePhoto}>
                    <Camera color={theme.primary} size={24} />
                    <Text style={[styles.modalActionText, { color: theme.primary }]}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Preview Mode */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleBackFromPreview}>
                    <ChevronLeft color={theme.text} size={24} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Preview Post</Text>
                  <TouchableOpacity
                    style={[styles.postSubmitButton, { backgroundColor: theme.primary }]}
                    onPress={handlePublishPost}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.postSubmitText}>Publish</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                  <View style={[styles.previewCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={styles.postHeader}>
                      <View style={styles.authorInfo}>
                        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                          {user?.profile_picture ? (
                            <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
                          ) : (
                            <UserIcon color="white" size={20} />
                          )}
                        </View>
                        <View>
                          <Text style={[styles.authorName, { color: theme.text }]}>{user?.full_name || 'You'}</Text>
                          <Text style={[styles.postTime, { color: theme.textLight }]}>Just now</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.postText, { color: theme.text }]}>{newPostContent}</Text>
                    {selectedImages.length > 0 && (
                      <PostImageCarousel
                        images={selectedImages}
                        onImagePress={() => { }}
                      />
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={viewerVisible} transparent={true} animationType="fade">
        <View style={styles.viewerContainer}>
          <SafeAreaView style={styles.viewerHeader} edges={['top']}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
              <X color="white" size={28} />
            </TouchableOpacity>
            {viewerImages.length > 1 && (
              <View style={styles.viewerCounter}>
                <Text style={styles.viewerCounterText}>{viewerIndex + 1}/{viewerImages.length}</Text>
              </View>
            )}
          </SafeAreaView>
          <FlatList
            data={viewerImages}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerIndex(idx);
            }}
            renderItem={({ item }) => (
              <ScrollView
                maximumZoomScale={4}
                minimumZoomScale={1}
                contentContainerStyle={styles.zoomContainer}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <Image source={{ uri: item }} style={styles.viewerImage} resizeMode="contain" />
              </ScrollView>
            )}
          />
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  postCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postTime: {
    fontSize: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  postImageWrapper: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  imageCarousel: {
    width: '100%',
    height: '100%',
  },
  postImage: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: 260,
    borderRadius: 12,
  },
  imageBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
  },
  createFirstText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postSubmitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  postSubmitText: {
    color: 'white',
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalInput: {
    fontSize: 18,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  selectedImagesRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  selectedImageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalActionText: {
    fontWeight: '600',
  },
  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  viewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  viewerImage: {
    width: width,
    height: '100%',
  },
  viewerClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCounter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewerCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  zoomContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  // Dot indicators
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.4)',
  },
  dotActive: {
    backgroundColor: '#10B981',
    width: 18,
    borderRadius: 4,
  },
  // Preview
  previewScroll: {
    flex: 1,
    padding: 20,
  },
  previewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  // Error and Retry
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  retryBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
