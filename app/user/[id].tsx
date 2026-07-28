import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Settings,
  MapPin,
  Sprout,
  Compass,
  Award,
  Grid,
  Users,
  Calendar,
  X,
  Heart,
  MessageCircle,
  MessageSquare,
  Share2,
  Check,
  Globe,
  BadgeCheck,
  UserX,
  UserCheck,
  Ban,
  Loader2,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useDirectChatStore } from '../../store/useDirectChatStore';

const { width } = Dimensions.get('window');

export default function VisitingUserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userIdParam = params?.id as string;
  const targetId = parseInt(userIdParam, 10);

  const { user: currentUser } = useAuthStore();
  const { blockUser, unblockUser, fetchBlockStatus, blockStatusMap } = useDirectChatStore();

  const isOwnProfile = currentUser && Number(currentUser.id) === targetId;

  // Profile data states
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Social stats & Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Active tab: 'posts' | 'overview'
  const [activeTab, setActiveTab] = useState<'posts' | 'overview'>('posts');

  // Network modal
  const [networkModal, setNetworkModal] = useState<'followers' | 'following' | null>(null);
  const [networkList, setNetworkList] = useState<any[]>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(false);

  // Block modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlockActionLoading, setIsBlockActionLoading] = useState(false);

  // Fetch target user profile & posts
  useEffect(() => {
    if (!targetId || isNaN(targetId)) return;

    if (isOwnProfile) {
      router.replace('/(tabs)/profile');
      return;
    }

    const loadProfileData = async () => {
      setLoadingProfile(true);
      try {
        let res;
        try {
          res = await api.get(`/api/users/${targetId}`);
        } catch (e) {
          res = await api.get(`/users/${targetId}`);
        }
        if (res.data) {
          setProfile(res.data);
          setIsFollowing(res.data.is_following || res.data.isFollowing || false);
          setFollowersCount(res.data.followers_count ?? 0);
          setFollowingCount(res.data.following_count ?? 0);
        }
      } catch (err) {
        console.error('[UserProfile] Failed to load user profile', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const loadUserPosts = async () => {
      setLoadingPosts(true);
      try {
        let res;
        try {
          res = await api.get(`/api/users/${targetId}/posts`);
        } catch (e) {
          res = await api.get(`/users/${targetId}/posts`);
        }
        setUserPosts(res.data || []);
      } catch (err) {
        console.error('[UserProfile] Failed to load user posts', err);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadProfileData();
    loadUserPosts();
    fetchBlockStatus(targetId);
  }, [targetId]);

  // Fetch Network list when modal opens
  useEffect(() => {
    if (!networkModal || !targetId) return;
    const loadNetwork = async () => {
      setLoadingNetwork(true);
      try {
        let res;
        try {
          res = await api.get(`/api/users/${targetId}/${networkModal}`);
        } catch (e) {
          res = await api.get(`/users/${targetId}/${networkModal}`);
        }
        setNetworkList(res.data || []);
      } catch (err) {
        console.error('[UserProfile] Failed to load network list', err);
        setNetworkList([]);
      } finally {
        setLoadingNetwork(false);
      }
    };
    loadNetwork();
  }, [networkModal, targetId]);

  // Block status
  const targetBlockStatus = targetId ? blockStatusMap[targetId] : null;
  const isBlockedByMe = targetBlockStatus?.blocked_by_me || false;

  const handleToggleFollow = async () => {
    if (!targetId || isFollowLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowLoading(true);

    const prevFollowing = isFollowing;
    const prevCount = followersCount;

    // Optimistic UI
    setIsFollowing(!prevFollowing);
    setFollowersCount(prevFollowing ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      let res;
      try {
        res = await api.post(`/api/users/${targetId}/follow`);
      } catch (e) {
        res = await api.post(`/users/${targetId}/follow`);
      }
      if (res.data) {
        if (typeof res.data.is_following === 'boolean') {
          setIsFollowing(res.data.is_following);
        }
        if (typeof res.data.followers_count === 'number') {
          setFollowersCount(res.data.followers_count);
        }
      }
    } catch (err) {
      // Revert optimistic update
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
      Alert.alert('Error', 'Failed to update follow status.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessageUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/messages?userId=${targetId}`);
  };

  const handleToggleBlock = async () => {
    if (!targetId || isBlockActionLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsBlockActionLoading(true);

    try {
      if (isBlockedByMe) {
        await unblockUser(targetId);
        Alert.alert('Success', 'User unblocked successfully.');
      } else {
        await blockUser(targetId);
        Alert.alert('Blocked', 'User blocked successfully.');
      }
      setShowBlockModal(false);
      fetchBlockStatus(targetId);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to update block status.');
    } finally {
      setIsBlockActionLoading(false);
    }
  };

  const handleShareProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const name = profile?.display_name || profile?.full_name || 'Farmer';
      await Share.share({
        message: `Check out ${name}'s agricultural profile on AgriNex AI!`,
      });
    } catch (e) {}
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Loading farmer profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.display_name || profile?.full_name || 'Farmer';
  const username = profile?.username || profile?.email?.split('@')[0] || 'farmer';
  const avatarSrc = profile?.profile_photo || profile?.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.email || targetId}`;
  const postsCount = profile?.posts_count ?? userPosts.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayName}
        </Text>
        <TouchableOpacity onPress={handleShareProfile} style={styles.iconBtn}>
          <Share2 size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Gradient Card */}
        <View style={styles.profileCard}>
          <View style={styles.banner}>
            <View style={styles.bannerOverlay} />
          </View>

          {/* Body */}
          <View style={styles.cardBody}>
            <View style={styles.avatarRow}>
              <Image source={{ uri: avatarSrc }} style={styles.avatarImage} />

              {/* Action Buttons */}
              <View style={styles.actionGroup}>
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  disabled={isFollowLoading}
                  style={[styles.btnFollow, isFollowing && styles.btnFollowing]}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={14} color="#0F172A" />
                      <Text style={styles.btnFollowingText}>Following</Text>
                    </>
                  ) : (
                    <>
                      <Users size={14} color="#FFFFFF" />
                      <Text style={styles.btnFollowText}>Follow</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleMessageUser} style={styles.btnMessage}>
                  <MessageSquare size={14} color="#FFFFFF" />
                  <Text style={styles.btnMessageText}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowBlockModal(true)} style={styles.btnBlock}>
                  <Ban size={16} color={isBlockedByMe ? '#DC2626' : '#64748B'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <Text style={styles.displayNameText}>{displayName}</Text>
                <BadgeCheck size={18} color="#16A34A" />
                <View style={styles.specBadge}>
                  <Text style={styles.specBadgeText}>
                    {profile?.crop_specialization || profile?.specialization || 'Agriculture'}
                  </Text>
                </View>
              </View>

              <Text style={styles.usernameText}>@{username}</Text>

              {profile?.bio ? (
                <Text style={styles.bioText}>{profile.bio}</Text>
              ) : null}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color="#16A34A" />
                  <Text style={styles.metaText}>
                    {profile?.village ? `${profile.village}, ${profile.district || ''}` : 'Local Agricultural Hub'}
                  </Text>
                </View>
                {profile?.created_at && (
                  <View style={styles.metaItem}>
                    <Calendar size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Social Stats Counters */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{postsCount}</Text>
                <Text style={styles.statLabel}>POSTS</Text>
              </View>

              <TouchableOpacity onPress={() => setNetworkModal('followers')} style={styles.statBox}>
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>FOLLOWERS</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setNetworkModal('following')} style={styles.statBox}>
                <Text style={styles.statNumber}>{followingCount}</Text>
                <Text style={styles.statLabel}>FOLLOWING</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
          >
            <Grid size={16} color={activeTab === 'posts' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>
              Posts ({userPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          >
            <Sprout size={16} color={activeTab === 'overview' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>
              Farm Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'posts' ? (
          loadingPosts ? (
            <View style={styles.tabLoading}>
              <ActivityIndicator size="small" color="#16A34A" />
              <Text style={styles.loadingText}>Loading farmer posts...</Text>
            </View>
          ) : userPosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Grid size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No posts published yet</Text>
              <Text style={styles.emptySub}>When {displayName} posts updates, they will appear here.</Text>
            </View>
          ) : (
            <View style={styles.postsList}>
              {userPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  {post.image_url ? (
                    <Image source={{ uri: post.image_url }} style={styles.postImage} />
                  ) : null}
                  <Text style={styles.postContent}>{post.content}</Text>
                  <View style={styles.postFooter}>
                    <View style={styles.postFooterItem}>
                      <Heart size={14} color="#E11D48" />
                      <Text style={styles.postFooterText}>{post.likes_count || 0}</Text>
                    </View>
                    <View style={styles.postFooterItem}>
                      <MessageCircle size={14} color="#64748B" />
                      <Text style={styles.postFooterText}>{post.comments_count || 0} comments</Text>
                    </View>
                    <Text style={styles.postDate}>
                      {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#F0FDF4' }]}>
                <MapPin size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.overviewLabel}>REGION LOCATION</Text>
                <Text style={styles.overviewVal}>
                  {profile?.village ? `${profile.village}, ${profile.district || ''} ${profile.state || ''}` : 'Not Specified'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Sprout size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.overviewLabel}>CROP SPECIALIZATION</Text>
                <Text style={styles.overviewVal}>
                  {profile?.crop_specialization || profile?.specialization || 'Not Specified'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#FFFBEB' }]}>
                <Award size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.overviewLabel}>FARMING EXPERIENCE</Text>
                <Text style={styles.overviewVal}>
                  {profile?.experience ? `${profile.experience} Years` : 'Not Specified'}
                </Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Compass size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.overviewLabel}>FARM LAND SIZE</Text>
                <Text style={styles.overviewVal}>
                  {profile?.farm_size ? `${profile.farm_size} Acres` : 'Not Specified'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Network Modal (Followers / Following) */}
      <Modal visible={Boolean(networkModal)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {networkModal === 'followers' ? 'Followers' : 'Following'} ({networkList.length})
              </Text>
              <TouchableOpacity onPress={() => setNetworkModal(null)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingNetwork ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color="#16A34A" />
              </View>
            ) : networkList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptySub}>No {networkModal} yet.</Text>
              </View>
            ) : (
              <FlatList
                data={networkList}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setNetworkModal(null);
                      router.push(`/user/${item.id}` as any);
                    }}
                    style={styles.netUserRow}
                  >
                    <Image
                      source={{ uri: item.profile_photo || item.profile_picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.email}` }}
                      style={styles.netAvatar}
                    />
                    <View style={styles.netInfo}>
                      <Text style={styles.netName}>{item.display_name || item.full_name || 'Farmer'}</Text>
                      <Text style={styles.netSub}>{item.village || 'AgriNex Hub'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Block Confirm Modal */}
      <Modal visible={showBlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.blockBox}>
            <Ban size={32} color={isBlockedByMe ? '#16A34A' : '#DC2626'} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.blockTitle}>
              {isBlockedByMe ? `Unblock ${displayName}?` : `Block ${displayName}?`}
            </Text>
            <Text style={styles.blockSub}>
              {isBlockedByMe
                ? 'Unblocking will allow this user to send you messages again.'
                : 'Blocked users will not be able to message you or view your profile.'}
            </Text>

            <View style={styles.blockBtnGroup}>
              <TouchableOpacity onPress={() => setShowBlockModal(false)} style={styles.blockBtnCancel}>
                <Text style={styles.blockBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleBlock}
                disabled={isBlockActionLoading}
                style={[styles.blockBtnConfirm, isBlockedByMe ? { backgroundColor: '#16A34A' } : { backgroundColor: '#DC2626' }]}
              >
                {isBlockActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.blockBtnConfirmText}>{isBlockedByMe ? 'Unblock' : 'Block User'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'center' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B' },
  scrollContent: { paddingBottom: 40 },
  profileCard: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 20, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2 },
  banner: { height: 120, backgroundColor: '#065F46', position: 'relative' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40, marginBottom: 12 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnFollow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16A34A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  btnFollowing: { backgroundColor: '#E2E8F0' },
  btnFollowText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  btnFollowingText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  btnMessage: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0F172A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  btnMessageText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  btnBlock: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  infoSection: { gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  displayNameText: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  specBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  specBadgeText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  usernameText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  bioText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748B' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 16, paddingTop: 12, justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, borderColor: '#E2E8F0', borderWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#0F172A' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabBtnTextActive: { color: '#FFFFFF' },
  tabLoading: { padding: 32, alignItems: 'center' },
  emptyCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, padding: 32, borderRadius: 16, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  postsList: { paddingHorizontal: 16, gap: 12 },
  postCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderColor: '#E2E8F0', borderWidth: 1, gap: 10 },
  postImage: { width: '100%', height: 180, borderRadius: 12 },
  postContent: { fontSize: 13, color: '#1E293B', lineHeight: 18 },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  postFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postFooterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  postDate: { fontSize: 10, color: '#94A3B8' },
  overviewGrid: { paddingHorizontal: 16, gap: 12 },
  overviewCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overviewIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overviewLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  overviewVal: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  closeBtn: { padding: 4 },
  netUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  netAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' },
  netInfo: { flex: 1 },
  netName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  netSub: { fontSize: 11, color: '#64748B' },
  blockBox: { backgroundColor: '#FFFFFF', margin: 24, borderRadius: 20, padding: 20, alignSelf: 'center', width: width - 48 },
  blockTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  blockSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  blockBtnGroup: { flexDirection: 'row', gap: 12 },
  blockBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  blockBtnCancelText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  blockBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  blockBtnConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
