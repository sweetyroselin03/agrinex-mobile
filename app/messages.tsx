import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ChevronLeft,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  X,
  Pin,
  VolumeX,
  Archive,
  UserX,
  UserCheck,
  Check,
  CheckCheck,
  MessageSquare,
  CheckCircle,
  UserPlus,
  Loader2,
  Ban,
  Download,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';

import { useAuthStore } from '../store/useAuthStore';
import { useDirectChatStore } from '../store/useDirectChatStore';
import type { DirectMessage, DirectConversation } from '../store/useDirectChatStore';
import client from '../api/client';

const { width, height } = Dimensions.get('window');

const POPULAR_EMOJIS = ['😊', '😂', '👍', '🌾', '🌱', '🚜', '❤️', '🔥', '👏', '🙏', '⚡', '💯'];

export default function MessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    blockStatusMap,
    isLoadingConversations,
    isLoadingMessages,
    fetchConversations,
    startConversation,
    selectConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    pinConversation,
    muteConversation,
    archiveConversation,
    fetchBlockStatus,
    blockUser,
    unblockUser,
    uploadMedia,
    connectWebSocket,
    sendTypingSignal,
  } = useDirectChatStore();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');

  // Input states
  const [textInput, setTextInput] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Dropdown & Modals
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [isBlockActionLoading, setIsBlockActionLoading] = useState(false);

  // Lightbox Modal
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Connect WebSocket & fetch on mount
  useEffect(() => {
    fetchConversations();
    if (user?.id) {
      connectWebSocket(user.id);
    }
  }, [user?.id]);

  // Handle deep-link target user ID parameter
  useEffect(() => {
    if (params?.userId) {
      const targetId = parseInt(params.userId as string, 10);
      if (!isNaN(targetId)) {
        startConversation(targetId);
      }
    }
  }, [params?.userId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const otherUser = activeConversation?.other_participant;

  // Fetch block status whenever active participant changes
  useEffect(() => {
    if (otherUser?.user_id) {
      fetchBlockStatus(otherUser.user_id);
    }
  }, [otherUser?.user_id]);

  const targetBlockStatus = otherUser ? blockStatusMap[otherUser.user_id] : null;
  const isBlockedByMe = targetBlockStatus?.blocked_by_me || false;
  const isBlockedByThem = targetBlockStatus?.blocked_by_them || false;
  const isBlocked = targetBlockStatus?.is_blocked || false;

  let blockBannerMessage: string | null = null;
  if (isBlockedByMe) {
    blockBannerMessage = 'You blocked this user.';
  } else if (isBlockedByThem) {
    blockBannerMessage = 'You have been blocked.';
  }

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await client.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setUserSearchResults(res.data || []);
      } catch (err) {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'AgriNex needs access to your gallery to send photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!activeConversationId || isSending || isBlocked || (!textInput.trim() && !selectedImageUri)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      let attachmentUrl: string | undefined;
      if (selectedImageUri) {
        attachmentUrl = await uploadMedia(selectedImageUri);
      }

      await sendMessage(
        activeConversationId,
        textInput.trim() || undefined,
        attachmentUrl ? [attachmentUrl] : undefined
      );

      setTextInput('');
      setSelectedImageUri(null);
      setShowEmojiPicker(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!otherUser) return;
    try {
      setIsBlockActionLoading(true);
      await blockUser(otherUser.user_id);
      setShowBlockModal(false);
      setShowOptionsMenu(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to block user.');
    } finally {
      setIsBlockActionLoading(false);
    }
  };

  const handleConfirmUnblock = async () => {
    if (!otherUser) return;
    try {
      setIsBlockActionLoading(true);
      await unblockUser(otherUser.user_id);
      setShowUnblockModal(false);
      setShowOptionsMenu(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to unblock user.');
    } finally {
      setIsBlockActionLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'archived') return c.is_archived;
    if (c.is_archived) return false;
    if (activeTab === 'unread') return c.unread_count > 0;
    if (searchQuery.trim()) {
      const name = c.other_participant?.full_name || c.other_participant?.username || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const activeTypingList = activeConversationId ? typingUsers[activeConversationId] || [] : [];

  // Render individual Message Item in Active Chat
  const renderMessageItem = ({ item }: { item: DirectMessage }) => {
    const isMe = item.sender_id === user?.id;
    const formattedTime = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
        <View
          style={[
            styles.bubbleContainer,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          {/* Attachments */}
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentWrapper}>
              {item.attachments.map((att) => (
                <TouchableOpacity
                  key={att.id || att.url}
                  activeOpacity={0.9}
                  onPress={() => {
                    setLightboxImageUri(att.url);
                    setLightboxVisible(true);
                  }}
                >
                  <Image source={{ uri: att.url }} style={styles.attachmentImage} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Text Content */}
          {item.content ? (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {item.content}
            </Text>
          ) : null}

          {/* Footer (Time & Checkmarks) */}
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
              {formattedTime}
            </Text>
            {isMe && (
              <View style={styles.checkIcon}>
                {item.status === 'seen' ? (
                  <CheckCheck size={14} color="#0891B2" />
                ) : (
                  <Check size={14} color="#16A34A" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── CONVERSATION LIST VIEW OR ACTIVE CHAT VIEW ─── */}
      {!activeConversationId ? (
        /* ─── CONVERSATION LIST SCREEN ─── */
        <View style={styles.listContainer}>
          {/* Top Bar */}
          <View style={styles.listHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <ChevronLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.listHeaderTitle}>Direct Messages</Text>
            <View style={styles.badgeLabel}>
              <Text style={styles.badgeText}>AgriNex</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={18} color="#94A3B8" />
              <TextInput
                placeholder="Search farmers or messages..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* Filter Pills */}
          {!searchQuery && (
            <View style={styles.tabsContainer}>
              {(['all', 'unread', 'archived'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                    {tab === 'all' ? 'All Chats' : tab === 'unread' ? 'Unread' : 'Archived'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Conversations or Farmer Search Results */}
          <ScrollView contentContainerStyle={styles.scrollList}>
            {searchQuery && userSearchResults.length > 0 ? (
              <View style={styles.searchResultsBox}>
                <Text style={styles.searchSectionHeader}>Farmer Search Results</Text>
                {userSearchResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userSearchItem}
                    onPress={() => {
                      startConversation(u.id);
                      setSearchQuery('');
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          u.profile_picture ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.username)}&background=16A34A&color=fff`,
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.full_name}</Text>
                      <Text style={styles.userTag}>@{u.username || 'farmer'}</Text>
                    </View>
                    <UserPlus size={18} color="#16A34A" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : isLoadingConversations ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const other = c.other_participant;
                const displayName = other?.full_name || other?.username || 'Farmer User';
                const avatarUri =
                  other?.profile_picture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=16A34A&color=fff`;

                const lastMsg = c.last_message;
                let formattedTime = '';
                if (lastMsg?.created_at) {
                  const d = new Date(lastMsg.created_at);
                  formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.card}
                    onPress={() => selectConversation(c.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatarWrapper}>
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                      {other?.is_online && <View style={styles.onlineDot} />}
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {displayName}
                        </Text>
                        {formattedTime ? <Text style={styles.cardTime}>{formattedTime}</Text> : null}
                      </View>

                      <View style={styles.cardFooter}>
                        <Text style={styles.cardSnippet} numberOfLines={1}>
                          {lastMsg?.content
                            ? lastMsg.content
                            : lastMsg?.attachments?.length
                            ? '📷 Photo'
                            : 'No messages yet'}
                        </Text>

                        {c.unread_count > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{c.unread_count}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <MessageSquare size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Conversations</Text>
                <Text style={styles.emptyDesc}>Search for a farmer above to start chatting!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        /* ─── ACTIVE CHAT SCREEN ─── */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatContainer}
        >
          {/* Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => selectConversation(0)} style={styles.iconBtn}>
              <ChevronLeft size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.chatHeaderUser}>
              <View style={styles.avatarWrapperSmall}>
                <Image
                  source={{
                    uri:
                      otherUser?.profile_picture ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        otherUser?.full_name || 'Farmer'
                      )}&background=16A34A&color=fff`,
                  }}
                  style={styles.avatarSmall}
                />
                {otherUser?.is_online && <View style={styles.onlineDotSmall} />}
              </View>

              <View style={styles.userTitles}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {otherUser?.full_name || 'Farmer'}
                </Text>
                <Text style={styles.headerStatus}>
                  {otherUser?.is_online ? 'Active Now' : 'Offline'}
                </Text>
              </View>
            </View>

            {/* Three Dot Options Button */}
            <TouchableOpacity onPress={() => setShowOptionsMenu((prev) => !prev)} style={styles.iconBtn}>
              <MoreVertical size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Options Dropdown Menu Modal */}
          {showOptionsMenu && (
            <Pressable style={styles.dropdownOverlay} onPress={() => setShowOptionsMenu(false)}>
              <View style={styles.dropdownCard}>
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (activeConversation) pinConversation(activeConversation.id);
                    setShowOptionsMenu(false);
                  }}
                >
                  <Pin size={16} color="#F59E0B" />
                  <Text style={styles.dropdownText}>
                    {activeConversation?.is_pinned ? 'Unpin Chat' : 'Pin Chat'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (activeConversation) muteConversation(activeConversation.id);
                    setShowOptionsMenu(false);
                  }}
                >
                  <VolumeX size={16} color="#0891B2" />
                  <Text style={styles.dropdownText}>
                    {activeConversation?.is_muted ? 'Unmute Notifications' : 'Mute Notifications'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (activeConversation) archiveConversation(activeConversation.id);
                    setShowOptionsMenu(false);
                  }}
                >
                  <Archive size={16} color="#9333EA" />
                  <Text style={styles.dropdownText}>
                    {activeConversation?.is_archived ? 'Unarchive Chat' : 'Archive Chat'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.dropdownDivider} />

                {isBlockedByMe ? (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setShowOptionsMenu(false);
                      setShowUnblockModal(true);
                    }}
                  >
                    <UserCheck size={16} color="#16A34A" />
                    <Text style={[styles.dropdownText, { color: '#16A34A' }]}>Unblock User</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setShowOptionsMenu(false);
                      setShowBlockModal(true);
                    }}
                  >
                    <UserX size={16} color="#DC2626" />
                    <Text style={[styles.dropdownText, { color: '#DC2626' }]}>Block User</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Pressable>
          )}

          {/* Messages FlatList */}
          <FlatList
            ref={flatListRef}
            data={activeMessages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              isLoadingMessages ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#16A34A" />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>Say Hello!</Text>
                  <Text style={styles.emptyDesc}>Start the conversation with {otherUser?.full_name || 'Farmer'}.</Text>
                </View>
              )
            }
            ListFooterComponent={
              !isBlocked && activeTypingList.length > 0 ? (
                <View style={styles.typingNotice}>
                  <Text style={styles.typingNoticeText}>{activeTypingList.join(', ')} is typing...</Text>
                </View>
              ) : null
            }
          />

          {/* Block Banner OR Input Bar */}
          {isBlocked ? (
            <View style={styles.blockBanner}>
              <Ban size={18} color="#DC2626" />
              <Text style={styles.blockBannerText}>{blockBannerMessage || 'You cannot message this user.'}</Text>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              {/* Selected Image Thumbnail Preview */}
              {selectedImageUri && (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: selectedImageUri }} style={styles.imagePreviewThumb} />
                  <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setSelectedImageUri(null)}>
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Input Row */}
              <View style={styles.inputRow}>
                <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
                  <Paperclip size={20} color="#64748B" />
                </TouchableOpacity>

                <TextInput
                  placeholder="Write a message..."
                  placeholderTextColor="#94A3B8"
                  value={textInput}
                  onChangeText={(val) => {
                    setTextInput(val);
                    if (activeConversationId && user) {
                      sendTypingSignal(activeConversationId, true, user.full_name || `Farmer ${user.id}`);
                    }
                  }}
                  multiline
                  style={styles.textInput}
                />

                <TouchableOpacity
                  onPress={handleSend}
                  disabled={(!textInput.trim() && !selectedImageUri) || isSending}
                  style={[
                    styles.sendBtn,
                    (!textInput.trim() && !selectedImageUri) || isSending ? styles.sendBtnDisabled : styles.sendBtnActive,
                  ]}
                >
                  {isSending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* ─── FULL-SCREEN IMAGE LIGHTBOX MODAL ─── */}
      <Modal visible={lightboxVisible} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxVisible(false)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxImageUri && (
            <Image source={{ uri: lightboxImageUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ─── BLOCK CONFIRMATION MODAL ─── */}
      <Modal visible={showBlockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <UserX size={40} color="#DC2626" />
            <Text style={styles.modalTitle}>Block User?</Text>
            <Text style={styles.modalSub}>This user won't be able to message or follow you.</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowBlockModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={handleConfirmBlock} disabled={isBlockActionLoading}>
                {isBlockActionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalBtnDangerText}>Block</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── UNBLOCK CONFIRMATION MODAL ─── */}
      <Modal visible={showUnblockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <UserCheck size={40} color="#16A34A" />
            <Text style={styles.modalTitle}>Unblock User?</Text>
            <Text style={styles.modalSub}>This user will be able to message you again.</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowUnblockModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSuccess} onPress={handleConfirmUnblock} disabled={isBlockActionLoading}>
                {isBlockActionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalBtnSuccessText}>Unblock</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeLabel: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeText: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 11,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#16A34A',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardSnippet: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  searchResultsBox: {
    gap: 8,
  },
  searchSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userTag: {
    fontSize: 12,
    color: '#64748B',
  },

  // ACTIVE CHAT STYLES
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  chatHeaderUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatarWrapperSmall: {
    position: 'relative',
  },
  avatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  onlineDotSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userTitles: {
    marginLeft: 10,
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerStatus: {
    fontSize: 11,
    color: '#22C55E',
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    left: 0,
    bottom: 0,
    zIndex: 40,
  },
  dropdownCard: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    width: 190,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },

  // MESSAGES BUBBLES
  messagesList: {
    padding: 16,
  },
  bubbleWrapper: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleWrapperMe: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperOther: {
    justifyContent: 'flex-start',
  },
  bubbleContainer: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: '#DCFCE7',
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#0F172A',
  },
  bubbleTextOther: {
    color: '#0F172A',
  },
  attachmentWrapper: {
    marginBottom: 6,
  },
  attachmentImage: {
    width: 200,
    height: 140,
    borderRadius: 14,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  bubbleTimeMe: {
    color: '#166534',
  },
  bubbleTimeOther: {
    color: '#64748B',
  },
  checkIcon: {
    marginLeft: 2,
  },
  typingNotice: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  typingNoticeText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },

  // INPUT & BANNER STYLES
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imagePreviewBox: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreviewThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#DC2626',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#16A34A',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  blockBanner: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  blockBannerText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '700',
  },

  // LIGHTBOX & MODALS
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  lightboxImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalBtnDangerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnSuccess: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
  },
  modalBtnSuccessText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  centerContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
