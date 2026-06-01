import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  Bell,
  Moon,
  Globe,
  LogOut,
  Info,
  ShieldCheck,
  ChevronRight,
  Shield,
  MessageCircle,
  Lock,
  Smartphone,
  Bookmark,
  Camera,
  Trash2,
  Eye
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAppTheme } from '../hooks/useAppTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, deleteAccount, updateProfile, user } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const { isDarkMode, theme } = useAppTheme();

  const [notifications, setNotifications] = useState(true);
  const [weatherPerms, setWeatherPerms] = useState(true);
  const [accountPrivacy, setAccountPrivacy] = useState(false);

  const handleSelectTheme = () => {
    Alert.alert(
      'Appearance Settings',
      'Choose your preferred visual theme.',
      [
        { text: 'System Default', onPress: () => setThemeMode('system') },
        { text: 'Light Mode', onPress: () => setThemeMode('light') },
        { text: 'Dark Mode', onPress: () => setThemeMode('dark') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout Session',
      'Are you sure you want to log out of AgriNex?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            logout();
            await AsyncStorage.multiRemove([
              'agrinex_remembered_creds',
              'agrinex_onboarding_completed',
            ]);
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your AgriNex account? This action is IRREVERSIBLE and will delete all your posts, scans, comments, and profile data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'WARNING: Final Confirmation',
              'This is your LAST warning. This will completely destroy all your data and access. Are you absolutely certain you want to proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      Alert.alert('Account Deleted', 'Your account has been permanently removed.');
                      router.replace('/(auth)/welcome');
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'Failed to delete account. Please try again.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant gallery access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        await updateProfile({ profile_picture: result.assets[0].uri });
        Alert.alert('Success', 'Profile photo updated successfully!');
      } catch (e) {
        Alert.alert('Error', 'Failed to update profile photo.');
      }
    }
  };

  const handleAlert = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const SettingItem = ({ icon: Icon, title, subtitle, value, onToggle, onPress, type = 'navigate', destructive = false }: any) => {
    const ItemContainer = onPress ? TouchableOpacity : View;
    return (
      <ItemContainer
        style={[styles.settingItem, { borderBottomColor: theme.border + '30' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconBox,
          { backgroundColor: destructive ? 'rgba(239, 68, 68, 0.1)' : (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') }
        ]}>
          <Icon color={destructive ? theme.error : theme.primary} size={18} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: destructive ? theme.error : theme.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textLight }]}>{subtitle}</Text>}
        </View>
        {type === 'switch' ? (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: isDarkMode ? '#334155' : '#CBD5E1', true: theme.primary }}
            thumbColor={'white'}
            style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : undefined}
          />
        ) : (
          <ChevronRight color={theme.textLight} size={16} />
        )}
      </ItemContainer>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ChevronLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Summary Card */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.profileSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          {user?.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarLetter}>{user?.full_name ? user.full_name[0].toUpperCase() : 'F'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: theme.text }]}>{user?.full_name || 'AgriNex Farmer'}</Text>
            <Text style={[styles.profileEmail, { color: theme.textLight }]}>{user?.email || 'farmer@agrinex.com'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editBadgeBtn, { backgroundColor: theme.mint }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={[styles.editBadgeText, { color: theme.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </MotiView>

        {/* SECTION - ACCOUNT & EDIT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>MY ACCOUNT</Text>
          <View style={[styles.cardPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon={User}
              title="Edit Profile"
              subtitle="Update village, specialization and crops"
              onPress={() => router.push('/(tabs)/profile')}
            />
            <SettingItem
              icon={Camera}
              title="Change Profile Photo"
              subtitle="Upload from camera or gallery"
              onPress={handleUploadPhoto}
            />
            <SettingItem
              icon={Bookmark}
              title="Saved Posts & Bookmarks"
              subtitle="View saved community articles"
              onPress={() => {
                // Route to profile page and tell it to switch to Saved tab
                router.push({ pathname: '/(tabs)/profile', params: { initialTab: 'saved' } });
              }}
            />
          </View>
        </View>

        {/* SECTION - APP */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>APP CONFIGURATION</Text>
          <View style={[styles.cardPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon={Bell}
              title="Notifications"
              subtitle="Push alerts & crop diagnostics"
              type="switch"
              value={notifications}
              onToggle={setNotifications}
            />
            <SettingItem
              icon={Moon}
              title="Theme Appearance"
              subtitle={`Active: ${themeMode === 'system' ? 'System Default' : themeMode === 'light' ? 'Light Mode' : 'Dark Mode'}`}
              onPress={handleSelectTheme}
            />
            <SettingItem
              icon={Globe}
              title="Language"
              subtitle="English (US)"
              onPress={() => handleAlert('Select Language', 'Currently, AgriNex supports English. More languages (Hindi, Marathi, Spanish) are coming in the next release.')}
            />
          </View>
        </View>

        {/* SECTION - SECURITY */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>SECURITY & PRIVACY</Text>
          <View style={[styles.cardPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon={Lock}
              title="Account Privacy"
              subtitle="Make account visible to followers only"
              type="switch"
              value={accountPrivacy}
              onToggle={setAccountPrivacy}
            />
            <SettingItem
              icon={Trash2}
              title="Delete Account"
              subtitle="Permanently remove your database records"
              onPress={handleDeleteAccount}
              destructive={true}
            />
          </View>
        </View>

        {/* SECTION - SUPPORT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textLight }]}>HELP & SUPPORT</Text>
          <View style={[styles.cardPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingItem
              icon={MessageCircle}
              title="Help Center"
              subtitle="FAQs and support chat ticket"
              onPress={() => handleAlert('Help Center', 'Please send an email to support@agrinex.com for priority help.')}
            />
            <SettingItem
              icon={Info}
              title="About AgriNex"
              subtitle="AgriTech mission & details"
              onPress={() => router.push('/about')}
            />
            <SettingItem
              icon={Shield}
              title="Privacy Policy"
              subtitle="Data collection policy details"
              onPress={() => handleAlert('Privacy Policy', 'AgriNex strictly encrypts your farm records and does not share scanning data with third parties.')}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDarkMode ? '#451a1a' : '#FEF2F2', borderColor: isDarkMode ? '#7f1d1d' : '#FEE2E2' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color={theme.error} size={20} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Log Out Session</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textLight }]}>AgriNex Premium Production v2.2.0</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  editBadgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
    opacity: 0.7,
  },
  cardPanel: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 1,
    opacity: 0.8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
  },
});
