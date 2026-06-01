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
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings, 
  MapPin, 
  Leaf, 
  Grid, 
  Bookmark, 
  Edit3, 
  X, 
  Share2,
  User as UserIcon,
  Heart,
  MessageCircle,
  Users,
  UserCheck,
  ShieldCheck,
  MoreVertical,
  Calendar,
  Download,
  Trash2,
  Camera
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/Colors';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { useAppTheme } from '../../hooks/useAppTheme';

const { width, height } = Dimensions.get('window');

// --- Helper for Severity Color ---
const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'healthy': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'critical': return '#EF4444';
    default: return '#64748B';
  }
};

const getSeverityEmoji = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '🟡';
  }
};

// --- Floating Particles Component for Premium Header ---
const FloatingParticles = () => {
  const particles = Array.from({ length: 8 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((_, i) => (
        <MotiView
          key={i}
          from={{ translateY: 120, translateX: Math.random() * width, opacity: 0, scale: 0.5 }}
          animate={{ translateY: -30, opacity: [0, 0.4, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{
            loop: true,
            duration: 4000 + Math.random() * 3000,
            delay: i * 400,
            type: 'timing',
          }}
          style={styles.particle}
        />
      ))}
    </View>
  );
};

// --- Animated Count-Up Text component ---
const AnimatedNumber = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1000; // 1 second
    const steps = 30;
    const stepTime = duration / steps;
    const increment = end / steps;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return (
    <Text style={styles.statValue}>{count}</Text>
  );
};

export default function ProfileTab() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialTab = params?.initialTab as string;

  const { user, updateProfile, checkAuth } = useAuthStore();
  const { posts, userPosts, fetchPosts, fetchUserPosts, fetchSavedPosts, savedPosts, savedPostIds, deletePost, editPost, toggleSavePost } = usePostStore();
  const { isDarkMode, theme } = useAppTheme();

  const [activeTab, setActiveTab] = useState('posts'); // tabs: posts, scans, saved
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scans, setScans] = useState<any[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);

  // Bottom Sheets / Modals States
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postSheetVisible, setPostSheetVisible] = useState(false);
  const [editCaptionVisible, setEditCaptionVisible] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState('');

  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [scanReportVisible, setScanReportVisible] = useState(false);

  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);

  // Profile Edit Modal States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editCrop, setEditCrop] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editFarmSize, setEditFarmSize] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPosts();
    fetchUserPosts();
    fetchSavedPosts();
    loadScanHistory();
  }, []);

  // Listen to router preset params
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
      setEditVillage(user.village || '');
      setEditCrop(user.crop_specialization || '');
      setEditExperience(user.experience || '');
      setEditFarmSize(user.farm_size || '');
    }
  }, [user]);

  const loadScanHistory = async () => {
    setLoadingScans(true);
    try {
      const historyRaw = await AsyncStorage.getItem('scan_history');
      if (historyRaw) {
        setScans(JSON.parse(historyRaw));
      } else {
        setScans([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScans(false);
    }
  };

  // savedPosts is now pulled directly from the store (includes all bookmarked posts, not just those in the active feed)

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `🌱 Connect with me on AgriNex! \n👨‍🌾 Farmer: ${user?.full_name || 'AgriNex Farmer'}\n🌾 Crop Specialization: ${user?.crop_specialization || 'Sustainable Farming'}\n📍 Village: ${user?.village || 'India'}\n\nJoin AgriNex and improve your crop yields today! 🚀`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Profile picture options handler
  const handlePhotoAction = async (action: 'gallery' | 'camera' | 'remove') => {
    setPhotoSheetVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (action === 'remove') {
      Alert.alert('Remove Photo', 'Are you sure you want to remove your profile picture?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              await updateProfile({ profile_picture: "" });
              Alert.alert('Success', 'Profile photo removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to remove photo.');
            } finally {
              setUploadingPhoto(false);
            }
          } 
        }
      ]);
      return;
    }

    const { status } = action === 'gallery'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', `AgriNex needs access to your ${action === 'gallery' ? 'gallery' : 'camera'} to update your profile photo.`);
      return;
    }

    const result = action === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.75,
          base64: true,
        })
      : await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.75,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const asset = result.assets[0];
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        await updateProfile({ profile_picture: base64Uri });
        Alert.alert('Success', 'Profile photo updated!');
      } catch (e) {
        Alert.alert('Error', 'Failed to update profile photo.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Full Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: editName,
        username: editUsername,
        bio: editBio,
        village: editVillage,
        crop_specialization: editCrop,
        experience: editExperience,
        farm_size: editFarmSize
      });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Post Actions
  const handlePostOption = async (action: 'edit' | 'delete' | 'save' | 'share') => {
    setPostSheetVisible(false);
    if (!selectedPost) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (action === 'share') {
      try {
        await Share.share({
          message: `${selectedPost.content}\n\n🌱 Shared from AgriNex Community!`,
        });
      } catch (e) { console.error(e); }
    } else if (action === 'save') {
      await toggleSavePost(selectedPost.id);
    } else if (action === 'edit') {
      setEditCaptionText(selectedPost.content);
      setEditCaptionVisible(true);
    } else if (action === 'delete') {
      Alert.alert('Delete Post', 'Are you sure you want to permanently remove this post?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deletePost(selectedPost.id);
            Alert.alert('Deleted', 'Your post has been deleted.');
          } 
        }
      ]);
    }
  };

  const handleSaveCaption = async () => {
    if (!editCaptionText.trim()) return;
    setEditCaptionVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await editPost(selectedPost.id, editCaptionText);
      Alert.alert('Success', 'Post caption updated!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update caption.');
    }
  };

  // Scan Actions
  const handleScanOption = async (action: 'view' | 'export' | 'share' | 'delete') => {
    setScanSheetVisible(false);
    if (!selectedScan) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (action === 'view') {
      setScanReportVisible(true);
    } else if (action === 'share') {
      try {
        await Share.share({
          message: `🌱 Crop Health Diagnosis Report\n🔬 Disease: ${selectedScan.result?.disease_name}\n📊 Confidence: ${selectedScan.result?.confidence}%\n${getSeverityEmoji(selectedScan.result?.severity_level)} Severity: ${selectedScan.result?.severity_level}`,
        });
      } catch (e) { console.error(e); }
    } else if (action === 'export') {
      try {
        const report = `🌱 AGRINEX AI REMEDIATION REPORT\n==================================\n🔬 Crop Disease: ${selectedScan.result?.disease_name}\n📊 AI Confidence: ${selectedScan.result?.confidence}%\n⚡ Severity Level: ${selectedScan.result?.severity_level}\n📅 Scanned On: ${new Date(selectedScan.date).toLocaleDateString()}\n\n💊 REMEDIATION RECOMMENDATION:\n${selectedScan.result?.treatment || 'No specific treatment recommended.'}\n\n🌿 ORGANIC PATHWAYS:\n${selectedScan.result?.organic_treatment || 'No specific organic treatments listed.'}\n\n💦 IRRIGATION ADVICE:\n${selectedScan.result?.irrigation_recommendations || 'Standard watering cycle.'}`;
        await Share.share({ message: report });
      } catch (e) { console.error(e); }
    } else if (action === 'delete') {
      Alert.alert('Delete Scan Report', 'Remove this crop scan record permanently?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            const updated = scans.filter(s => s.id !== selectedScan.id);
            setScans(updated);
            await AsyncStorage.setItem('scan_history', JSON.stringify(updated));
            Alert.alert('Deleted', 'Crop scan record removed.');
          } 
        }
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- Compact Gradient Header --- */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#064e3b', '#065f46', '#0f766e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          />
          <FloatingParticles />
          
          <SafeAreaView edges={['top']} style={styles.headerBtns}>
            <View />
            <TouchableOpacity 
              style={styles.settingsGlowBtn} 
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <Settings color="white" size={22} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* --- Profile Content Card --- */}
        <View style={[styles.profileCardContainer, { backgroundColor: theme.background }]}>
          {/* Avatar */}
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => setPhotoSheetVisible(true)} 
            activeOpacity={0.85}
          >
            <MotiView
              from={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              style={[styles.avatarBorder, { backgroundColor: theme.background, shadowColor: theme.primary }]}
            >
              {uploadingPhoto ? (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <ActivityIndicator color="white" />
                </View>
              ) : user?.profile_picture ? (
                <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                  <UserIcon color="white" size={28} />
                </View>
              )}
            </MotiView>
            <View style={styles.cameraBadge}>
              <Edit3 color="white" size={10} />
            </View>
          </TouchableOpacity>

          {/* Name + Username + Location */}
          <View style={styles.detailsContainer}>
            <Text style={[styles.name, { color: theme.text }]}>{user?.full_name || 'AgriNex Farmer'}</Text>
            <Text style={[styles.username, { color: theme.textLight }]}>@{user?.username || user?.email?.split('@')[0] || 'farmer_user'}</Text>
            
            <View style={styles.locationRow}>
              <MapPin size={13} color={theme.primary} />
              <Text style={[styles.locationText, { color: theme.textLight }]}>{user?.village || 'Maharashtra'}, India</Text>
            </View>

            <Text style={[styles.bio, { color: theme.text }]} numberOfLines={2}>
              {user?.bio || 'Passionate farmer exploring AI-powered sustainable agriculture. 🌱'}
            </Text>

            {/* 4-Column Stats Row */}
            <View style={[styles.statsCard, { backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)', borderColor: theme.border }]}>
              <View style={styles.statBox}>
                <AnimatedNumber value={userPosts.length || 0} />
                <Text style={[styles.statLabel, { color: theme.textLight }]}>Posts</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <AnimatedNumber value={scans.length || 0} />
                <Text style={[styles.statLabel, { color: theme.textLight }]}>Scans</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <AnimatedNumber value={user?.followers_count || 0} />
                <Text style={[styles.statLabel, { color: theme.textLight }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <AnimatedNumber value={user?.following_count || 0} />
                <Text style={[styles.statLabel, { color: theme.textLight }]}>Following</Text>
              </View>
            </View>

            {/* 2-Button Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setIsEditModalVisible(true)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryEditBtn}
                >
                  <Edit3 color="white" size={15} />
                  <Text style={styles.primaryEditBtnText}>Edit Profile</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Share2 color={theme.text} size={15} />
                <Text style={[styles.shareBtnText, { color: theme.text }]}>Share Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- Tabs Bar Section (Counts Removed) --- */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          {[
            { id: 'posts', label: 'Posts' },
            { id: 'scans', label: 'Scans' },
            { id: 'saved', label: 'Saved' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, { color: isActive ? theme.primary : theme.textLight, fontWeight: isActive ? '800' : '600' }]}>
                  {tab.label}
                </Text>
                {isActive && (
                  <MotiView
                    layout={Layout}
                    style={[styles.activeUnderline, { backgroundColor: theme.primary }]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --- Tab Content Grid --- */}
        <View style={styles.tabContentContainer}>

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            userPosts.length === 0 ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.emptyStateContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: theme.mint }]}>
                  <Grid size={36} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Posts Yet</Text>
                <Text style={[styles.emptyDesc, { color: theme.textLight }]}>
                  Share your farming journey with the AgriNex community!
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <Text style={styles.emptyActionText}>Go to Community</Text>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <View style={styles.gridWrapper}>
                {userPosts.map((post, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.gridItem, { borderColor: theme.border }]} 
                    onPress={() => {
                      setSelectedPost(post);
                      setPostSheetVisible(true);
                    }}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedPost(post);
                      setPostSheetVisible(true);
                    }}
                  >
                    {post.image_url ? (
                      <Image source={{ uri: post.image_url }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridPlaceholder, { backgroundColor: theme.card }]}>
                        <Text style={[styles.gridText, { color: theme.textLight }]} numberOfLines={3}>{post.content}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

          {/* Scans Tab */}
          {activeTab === 'scans' && (
            loadingScans ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
            ) : scans.length === 0 ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.emptyStateContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: theme.mint }]}>
                  <Leaf size={36} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Crop Scans Yet</Text>
                <Text style={[styles.emptyDesc, { color: theme.textLight }]}>
                  Scan your crop leaves to diagnose health issues, discover pests, and receive expert AI remediation advice.
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/(tabs)/scan')}
                >
                  <Text style={styles.emptyActionText}>Start Scanning</Text>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <View style={styles.scansListContainer}>
                {scans.map((scan: any) => {
                  const cardColor = getSeverityColor(scan.result?.severity_level);
                  return (
                    <TouchableOpacity
                      key={scan.id}
                      style={[styles.scanCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedScan(scan);
                        setScanReportVisible(true);
                      }}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedScan(scan);
                        setScanSheetVisible(true);
                      }}
                    >
                      <Image source={{ uri: scan.imageUri }} style={styles.scanCompactImage} />
                      <View style={styles.scanCompactInfo}>
                        <Text style={[styles.scanCompactTitle, { color: theme.text }]} numberOfLines={1}>
                          {scan.result?.disease_name || 'Unknown Crop'}
                        </Text>
                        <View style={styles.scanCompactMeta}>
                          <View style={[styles.scanCompactBadge, { backgroundColor: cardColor + '20', borderColor: cardColor }]}>
                            <Text style={[styles.scanCompactBadgeText, { color: cardColor }]}>
                              {scan.result?.severity_level || 'Warning'}
                            </Text>
                          </View>
                          <Text style={[styles.scanCompactConfidence, { color: theme.textLight }]}>
                            {scan.result?.confidence || 80}%
                          </Text>
                        </View>
                        <View style={styles.scanCompactDateRow}>
                          <Calendar size={10} color={theme.textLight} />
                          <Text style={[styles.scanCompactDate, { color: theme.textLight }]}>{formatDate(scan.date)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}

          {/* Saved Tab */}
          {activeTab === 'saved' && (
            savedPosts.length === 0 ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.emptyStateContainer}>
                <View style={[styles.emptyIconBox, { backgroundColor: theme.mint }]}>
                  <Bookmark size={36} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Posts</Text>
                <Text style={[styles.emptyDesc, { color: theme.textLight }]}>
                  Bookmark updates, images, and tips from other farmers in the AgriNex Community feed to reference here.
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <Text style={styles.emptyActionText}>Browse Community</Text>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <View style={styles.gridWrapper}>
                {savedPosts.map((post, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.gridItem, { borderColor: theme.border }]} 
                    onPress={() => {
                      setSelectedPost(post);
                      setPostSheetVisible(true);
                    }}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedPost(post);
                      setPostSheetVisible(true);
                    }}
                  >
                    {post.image_url ? (
                      <Image source={{ uri: post.image_url }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridPlaceholder, { backgroundColor: theme.card }]}>
                        <Text style={[styles.gridText, { color: theme.textLight }]} numberOfLines={3}>{post.content}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* --- Profile Photo Options Sheet --- */}
      <Modal visible={photoSheetVisible} animationType="slide" transparent={true}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetPanel, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Profile Picture Options</Text>
              <TouchableOpacity onPress={() => setPhotoSheetVisible(false)} style={styles.sheetClose}>
                <X color={theme.text} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetBody}>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handlePhotoAction('gallery')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><UserIcon color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handlePhotoAction('camera')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><Camera color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>Capture from Camera</Text>
              </TouchableOpacity>
              {user?.profile_picture ? (
                <TouchableOpacity style={styles.sheetOption} onPress={() => handlePhotoAction('remove')}>
                  <View style={[styles.optionIcon, { backgroundColor: '#EF444415' }]}><Trash2 color="#EF4444" size={18} /></View>
                  <Text style={[styles.optionText, { color: '#EF4444' }]}>Remove Current Photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Post Options Bottom Sheet --- */}
      <Modal visible={postSheetVisible} animationType="slide" transparent={true}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetPanel, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Post Actions</Text>
              <TouchableOpacity onPress={() => setPostSheetVisible(false)} style={styles.sheetClose}>
                <X color={theme.text} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetBody}>
              {selectedPost?.user_id === user?.id && (
                <TouchableOpacity style={styles.sheetOption} onPress={() => handlePostOption('edit')}>
                  <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><Edit3 color={theme.primary} size={18} /></View>
                  <Text style={[styles.optionText, { color: theme.text }]}>Edit Caption</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.sheetOption} onPress={() => handlePostOption('save')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}>
                  <Bookmark color={theme.primary} size={18} fill={savedPostIds.includes(selectedPost?.id) ? theme.primary : 'transparent'} />
                </View>
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {savedPostIds.includes(selectedPost?.id) ? 'Remove Bookmark' : 'Save Post'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handlePostOption('share')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><Share2 color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>Share Post</Text>
              </TouchableOpacity>
              {selectedPost?.user_id === user?.id && (
                <TouchableOpacity style={styles.sheetOption} onPress={() => handlePostOption('delete')}>
                  <View style={[styles.optionIcon, { backgroundColor: '#EF444415' }]}><Trash2 color="#EF4444" size={18} /></View>
                  <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Post</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Edit Caption Modal --- */}
      <Modal visible={editCaptionVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.captionSheet, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Post Caption</Text>
              <TouchableOpacity onPress={() => setEditCaptionVisible(false)} style={styles.modalCloseBtn}>
                <X size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.captionBody}>
              <TextInput
                style={[styles.captionInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={editCaptionText}
                onChangeText={setEditCaptionText}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity style={[styles.saveCaptionBtn, { backgroundColor: theme.primary }]} onPress={handleSaveCaption}>
                <Text style={styles.saveCaptionBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Scan Options Bottom Sheet --- */}
      <Modal visible={scanSheetVisible} animationType="slide" transparent={true}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetPanel, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Scan Actions</Text>
              <TouchableOpacity onPress={() => setScanSheetVisible(false)} style={styles.sheetClose}>
                <X color={theme.text} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetBody}>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handleScanOption('view')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><ShieldCheck color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>View Diagnosis Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handleScanOption('export')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><Download color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>Export Actionable Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handleScanOption('share')}>
                <View style={[styles.optionIcon, { backgroundColor: theme.mint }]}><Share2 color={theme.primary} size={18} /></View>
                <Text style={[styles.optionText, { color: theme.text }]}>Share Scan Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={() => handleScanOption('delete')}>
                <View style={[styles.optionIcon, { backgroundColor: '#EF444415' }]}><Trash2 color="#EF4444" size={18} /></View>
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Scan Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Full Scan Report Modal --- */}
      <Modal visible={scanReportVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.reportViewer, { backgroundColor: theme.background }]}>
          <View style={[styles.reportHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setScanReportVisible(false)} style={[styles.reportClose, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <X color={theme.text} size={22} />
            </TouchableOpacity>
            <Text style={[styles.reportHeaderTitle, { color: theme.text }]}>Crop Diagnosis Report</Text>
            <View style={{ width: 42 }} />
          </View>

          <ScrollView contentContainerStyle={styles.reportScrollContent}>
            {selectedScan?.imageUri && (
              <Image source={{ uri: selectedScan.imageUri }} style={styles.reportHeroImage} />
            )}
            
            <View style={styles.reportMainDetails}>
              <Text style={[styles.reportTitle, { color: theme.text }]}>{selectedScan?.result?.disease_name || 'Crop Leaf Scan'}</Text>
              <View style={styles.reportBadges}>
                <View style={[styles.reportBadge, { backgroundColor: getSeverityColor(selectedScan?.result?.severity_level) + '20', borderColor: getSeverityColor(selectedScan?.result?.severity_level) }]}>
                  <Text style={[styles.reportBadgeText, { color: getSeverityColor(selectedScan?.result?.severity_level) }]}>
                    {selectedScan?.result?.severity_level}
                  </Text>
                </View>
                <View style={[styles.reportBadge, { backgroundColor: theme.mint + '40', borderColor: theme.primary }]}>
                  <Text style={[styles.reportBadgeText, { color: theme.primary }]}>
                    {selectedScan?.result?.confidence}% Confidence
                  </Text>
                </View>
              </View>
            </View>

            {/* Treatment cards */}
            <View style={styles.reportSection}>
              <Text style={[styles.reportLabel, { color: theme.textLight }]}>💊 REMEDIATION TREATMENT</Text>
              <View style={[styles.reportContentBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.reportContentText, { color: theme.text }]}>{selectedScan?.result?.treatment || 'No specific chemicals listed.'}</Text>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={[styles.reportLabel, { color: theme.textLight }]}>🌿 ORGANIC TREATMENTS</Text>
              <View style={[styles.reportContentBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.reportContentText, { color: theme.text }]}>{selectedScan?.result?.organic_treatment || 'No specific organic treatments listed.'}</Text>
              </View>
            </View>

            <View style={styles.reportSection}>
              <Text style={[styles.reportLabel, { color: theme.textLight }]}>💦 IRRIGATION & WATER</Text>
              <View style={[styles.reportContentBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.reportContentText, { color: theme.text }]}>{selectedScan?.result?.irrigation_recommendations || 'Maintain normal watering cycle.'}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* --- Edit Profile modal --- */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoiding}
          >
            <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Personal Details</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Form Scroll */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Full Name</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.textLight + '70'}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Username</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="farmer_handle"
                    placeholderTextColor={theme.textLight + '70'}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Bio</Text>
                  <TextInput
                    style={[styles.formInput, styles.formInputArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Tell the community about your farming passion..."
                    placeholderTextColor={theme.textLight + '70'}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Village / City</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editVillage}
                    onChangeText={setEditVillage}
                    placeholder="Village Name"
                    placeholderTextColor={theme.textLight + '70'}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Crop Specialization</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editCrop}
                    onChangeText={setEditCrop}
                    placeholder="e.g. Rice, Sugarcane, Organic Wheat"
                    placeholderTextColor={theme.textLight + '70'}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Years of Experience</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editExperience}
                    onChangeText={setEditExperience}
                    placeholder="e.g. 10"
                    placeholderTextColor={theme.textLight + '70'}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: theme.textLight }]}>Farm Scale / Size</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                    value={editFarmSize}
                    onChangeText={setEditFarmSize}
                    placeholder="e.g. 5 Acres"
                    placeholderTextColor={theme.textLight + '70'}
                  />
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>

              {/* Submit Buttons */}
              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <TouchableOpacity 
                  style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalSaveBtn}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    height: 150,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    alignItems: 'center',
    zIndex: 10,
  },
  settingsGlowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  profileCardContainer: {
    marginTop: -45,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  avatarContainer: {
    marginTop: -55,
    alignSelf: 'center',
    position: 'relative',
    zIndex: 10,
  },
  avatarGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -5,
    left: -5,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 15,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
    width: '100%',
  },
  primaryEditBtn: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryEditBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    height: 46,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    width: '45%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyActionText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  scansListContainer: {
    gap: 12,
  },
  scanCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  scanCompactImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  scanCompactInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  scanCompactTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  scanCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scanCompactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  scanCompactBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scanCompactConfidence: {
    fontSize: 11,
    fontWeight: '600',
  },
  scanCompactDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  scanCompactDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  scanDetails: {
    padding: 12,
    gap: 4,
  },
  scanTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  scanMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  confidenceContainer: {
    width: '100%',
    gap: 4,
  },
  confidenceBar: {
    height: 3,
    borderRadius: 1.5,
  },
  scanConfidence: {
    fontSize: 10,
    fontWeight: '600',
  },
  scanFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    opacity: 0.8,
  },
  scanDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 52) / 2,
    height: (width - 52) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  gridText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Modal & Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoiding: {
    width: '100%',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.75,
    width: '100%',
    paddingTop: 20,
  },
  captionSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.45,
    width: '100%',
    paddingTop: 20,
  },
  captionBody: {
    padding: 24,
    gap: 16,
  },
  captionInput: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  saveCaptionBtn: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveCaptionBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(100,116,139,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFormScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  formInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  formInputArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
  modalSaveBtn: {
    width: width * 0.5,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },

  // Sheet overlay styles (Glassmorphism Bottom Sheets)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetPanel: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100,116,139,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBody: {
    gap: 12,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: 'rgba(100,116,139,0.05)',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Scan Report Details Viewer Modal
  reportViewer: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reportClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  reportScrollContent: {
    padding: 20,
    gap: 20,
  },
  reportHeroImage: {
    width: '100%',
    height: 240,
    borderRadius: 24,
  },
  reportMainDetails: {
    gap: 8,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  reportBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  reportBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reportSection: {
    gap: 8,
  },
  reportLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  reportContentBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  reportContentText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
});
