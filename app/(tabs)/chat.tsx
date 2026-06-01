import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  Image as ImageIcon,
  Camera,
  Bot,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Menu,
  Plus,
  Bookmark,
  ChevronRight,
  Settings,
  LogOut,
  MessageSquare,
  X,
  Pencil,
  Search,
  Mic,
  Globe,
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constants/Colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessage, analyzeCropImage } from '../../services/groqService';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import ErrorBoundary from '../../components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../../api/client';

const { width } = Dimensions.get('window');
const CHAT_STORAGE_KEY = 'agrinex_premium_chat_v5';

const SUGGESTIONS = [
  "🌾 Best fertilizer for rice?",
  "🍅 Tomato disease treatment",
  "💧 Irrigation tips",
  "🌱 Organic farming",
  "🌿 Neem oil usage",
];

const formatTime = (timeStr: string) => {
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

interface ChatMsg {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  imageUri?: string;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  messages: ChatMsg[];
  createdAt: string;
  updatedAt: string;
}

export default function ChatTab() {
  const { user, logout, checkAuth } = useAuthStore();
  const { isDarkMode, theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Core Conversation States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Interaction States
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isImageBusy, setIsImageBusy] = useState(false);

  // Keyboard spacing state to avoid overlapping tab navigation
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Rename modal states
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renameTargetId, setRenameTargetId] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Language selection state
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
  ];

  const flatListRef = useRef<FlatList<ChatMsg>>(null);

  // Keyboard listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardActive(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load chat system on mount
  useEffect(() => {
    checkAuth().catch(() => { });
    loadConversations();
  }, []);

  // Sync scroll
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isLoading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  const scrollToBottom = useCallback(
    (animated = true) => {
      if (messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated });
        }, 100);
      }
    },
    [messages]
  );

  const welcomeMsg = (): ChatMsg => ({
    id: 'welcome_' + Date.now(),
    text: `Hello **${user?.full_name || 'Farmer'}**! 🌾\n\nI'm your **AgriNex AI Assistant**. Ask me anything about crop diseases, organic treatments, soil wellness, or seed growth. I'm here to maximize your yield! 📈\n\nTry checking the suggestions below, or attach a photo of your crop.`,
    sender: 'ai',
    time: new Date().toISOString(),
  });

  const loadConversations = async () => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      let localConvs: Conversation[] = [];

      if (raw) {
        localConvs = JSON.parse(raw);
      }

      if (localConvs.length === 0) {
        const fresh = createFreshConversation();
        localConvs = [fresh];
        setConversations(localConvs);
        setActiveConversationId(fresh.id);
        setMessages(fresh.messages);
        await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(localConvs));
      } else {
        localConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setConversations(localConvs);
        setActiveConversationId(localConvs[0].id);
        setMessages(localConvs[0].messages.length > 0 ? localConvs[0].messages : [welcomeMsg()]);
      }
    } catch (e) {
      console.error(e);
      showToast('Unable to load chat history');
    }
  };

  const createFreshConversation = (): Conversation => {
    const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const welcome = welcomeMsg();
    return {
      id,
      title: 'New Chat',
      preview: 'Start a fresh conversation...',
      messages: [welcome],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const saveConversations = async (list: Conversation[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewChat = () => {
    setSidebarOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const fresh = createFreshConversation();
    const updated = [fresh, ...conversations];
    setConversations(updated);
    setActiveConversationId(fresh.id);
    setMessages(fresh.messages);
    setSelectedImage(null);
    setInput('');
    saveConversations(updated);
  };

  const selectConversation = (id: string) => {
    setSidebarOpen(false);
    setActiveConversationId(id);
    const matched = conversations.find((c) => c.id === id);
    if (matched) {
      setMessages(matched.messages.length > 0 ? matched.messages : [welcomeMsg()]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear Chat', 'Reset current conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

          const fresh = createFreshConversation();
          const updated = conversations.map((c) => {
            if (c.id === activeConversationId) {
              return {
                ...c,
                messages: fresh.messages,
                preview: 'Start a fresh conversation...',
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });

          setConversations(updated);
          setMessages(fresh.messages);
          setSelectedImage(null);
          setInput('');
          await saveConversations(updated);
        },
      },
    ]);
  };

  const handleDeleteConversation = (id: string) => {
    Alert.alert('Delete Chat', 'Remove this conversation permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const filtered = conversations.filter((c) => c.id !== id);

          if (filtered.length === 0) {
            const fresh = createFreshConversation();
            setConversations([fresh]);
            setActiveConversationId(fresh.id);
            setMessages(fresh.messages);
            await saveConversations([fresh]);
          } else {
            setConversations(filtered);
            if (activeConversationId === id) {
              setActiveConversationId(filtered[0].id);
              setMessages(filtered[0].messages.length ? filtered[0].messages : [welcomeMsg()]);
            }
            await saveConversations(filtered);
          }
        },
      },
    ]);
  };

  const openRenameModal = (id: string, currentTitle: string) => {
    setRenameTargetId(id);
    setRenameText(currentTitle === 'New Chat' ? '' : currentTitle);
    setRenameModalVisible(true);
  };

  const handleRenameSave = async () => {
    const titleToSave = renameText.trim() || 'New Chat';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updated = conversations.map((c) => {
      if (c.id === renameTargetId) {
        return {
          ...c,
          title: titleToSave,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setConversations(updated);
    await saveConversations(updated);
    setRenameModalVisible(false);

    try {
      if (user) {
        await client.put(`/chat/conversation/${renameTargetId}/title`, {
          message: titleToSave,
        });
      }
    } catch (_) { }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setIsImageBusy(true);
      const { status } =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          `AgriNex needs access to your ${source === 'camera' ? 'camera' : 'gallery'} to analyze crop leaves.`
        );
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error(e);
      showToast('Unable to pick crop photo');
    } finally {
      setIsImageBusy(false);
    }
  };

  const handleSend = async (text: string = input) => {
    const msgText = text.trim();
    if (!msgText && !selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMsg = {
      id: 'msg_' + Date.now(),
      text: msgText || '📷 Attached crop leaf for analysis',
      sender: 'user',
      time: new Date().toISOString(),
      imageUri: selectedImage || undefined,
    };

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput('');
    const imgToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    const updatedConvs = conversations.map((c) => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: updatedMsgs,
          preview: msgText || 'Photo analysis request',
          title: c.title === 'New Chat' ? (msgText.slice(0, 24) || 'Photo Analysis') : c.title,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setConversations(updatedConvs);
    saveConversations(updatedConvs);

    try {
      let aiResponseText = '';

      if (imgToSend) {
        // Run vision crop analysis directly
        const result = await analyzeCropImage(imgToSend);

        if (result.is_valid_crop === false) {
          aiResponseText = `⚠️ **Invalid Crop Scan**\n\n${result.rejection_reason || 'The image provided is not clear or does not contain a crop leaf. Please retake the photo and try again.'}`;
        } else {
          const isHealthy = result.disease_name === 'Healthy Crop' || result.severity_level === 'Healthy';
          if (isHealthy) {
            aiResponseText =
              `🌱 **Crop Status: Healthy**\n\n` +
              `📋 **Crop Type**: ${result.crop_type || 'Unknown'}\n` +
              `🎯 **Confidence**: ${result.confidence?.toFixed(1) || '95.0'}%\n\n` +
              `🔍 **Analysis**: The crop leaf appears healthy and free of pathogenic infections.\n\n` +
              `💧 **Irrigation Advice**: ${result.irrigation_recommendations || 'Maintain normal irrigation.'}\n\n` +
              `🧪 **Fertilizer Suggestion**: ${result.fertilizer_recommendations || 'Apply balanced nutrients.'}\n\n` +
              `💡 **Pro Tip**: ${result.pro_tips || 'Keep monitoring regularly.'}`;
          } else {
            aiResponseText =
              `🍂 **Crop Diagnosis: ${result.disease_name}**\n\n` +
              `📋 **Crop Type**: ${result.crop_type || 'Unknown'}\n` +
              `🎯 **Confidence**: ${result.confidence?.toFixed(1) || '85.0'}%\n` +
              `⚠️ **Severity**: ${result.severity_level || 'Moderate'}\n` +
              `📉 **Yield Impact**: ${result.yield_impact || 'Moderate impact if untreated.'}\n\n` +
              `🔍 **Symptoms & Causes**:\n${result.symptoms || 'Symptoms observed on foliage.'}\n\n` +
              `💊 **Chemical Treatment**:\n${result.treatment || result.pesticide_recommendations || 'Standard fungicides.'}\n\n` +
              `🌿 **Organic Solution**:\n${result.organic_treatment || 'Apply organic neem oil.'}\n\n` +
              `🔄 **Recovery Plan**:\n${result.recovery_steps || 'Prune affected leaves.'}\n\n` +
              `💡 **Pro Tip**: ${result.pro_tips || 'Rotate crops next season.'}`;
          }
        }
      } else {
        // Normal text message
        const chatHistory = updatedMsgs
          .filter((m) => m.sender === 'user' && m.id !== userMsg.id)
          .slice(-10)
          .map((m) => m.text);

        // Instruct AI to reply in the selected language if not English
        const msgWithLanguage = selectedLanguage !== 'English'
          ? `${msgText} (Please reply in ${selectedLanguage})`
          : msgText;

        aiResponseText = await sendMessage(msgWithLanguage, activeConversationId, undefined, chatHistory);
      }

      const aiMsg: ChatMsg = {
        id: 'msg_ai_' + Date.now(),
        text: aiResponseText || "Sorry, I couldn't process that. Please try again.",
        sender: 'ai',
        time: new Date().toISOString(),
      };

      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const finalConvs = updatedConvs.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: finalMsgs,
            preview: aiMsg.text.slice(0, 80),
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      setConversations(finalConvs);
      saveConversations(finalConvs);
    } catch (error: any) {
      console.log(error);
      showToast("Unable to connect to AI server");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Remove markdown formatting from copied text
    const cleanText = text.replace(/\*\*/g, '').replace(/###/g, '');
    await Clipboard.setStringAsync(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLanguageCycle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }> = LANGUAGES.map((lang) => ({
      text: lang.name,
      onPress: () => {
        setSelectedLanguage(lang.name);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      style: 'default',
    }));
    buttons.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      'Select Language',
      'Choose preferred language for AI responses:',
      buttons
    );
  };

  // Filtered and Grouped Conversations
  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const groupedConvs = useMemo(() => {
    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    filteredConvs.forEach((c) => {
      const d = new Date(c.updatedAt || c.createdAt);
      if (d >= today) {
        groups['Today'].push(c);
      } else if (d >= yesterday) {
        groups['Yesterday'].push(c);
      } else if (d >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(c);
      } else {
        groups['Older'].push(c);
      }
    });

    return groups;
  }, [filteredConvs]);

  const handleLogout = () => {
    setSidebarOpen(false);
    Alert.alert('Logout', 'Log out of AgriNex?', [
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
        },
      },
    ]);
  };

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Status Notch Offset */}
        <View style={{ height: insets.top, backgroundColor: theme.card }} />

        {/* ChatGPT Style Premium Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.hamburger}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSidebarOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Menu color={theme.text} size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              AgriNex AI Assistant
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statusText, { color: theme.textLight }]}>Online • AI Farming Expert</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClearHistory} activeOpacity={0.7}>
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>

        {/* Float-In Network Alert Toast */}
        <AnimatePresence>
          {toastVisible && toastMessage && (
            <MotiView
              from={{ opacity: 0, translateY: -25 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -25 }}
              style={[styles.toastContainer, { backgroundColor: '#EF4444' }]}
            >
              <Text style={styles.toastText}>⚠️ {toastMessage}</Text>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Keyboard Avoiding Layout */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Main Message viewport */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isUser = item.sender === 'user';
              const hasCopied = copiedId === item.id;

              return (
                <MotiView
                  from={{ opacity: 0, translateY: 10, scale: 0.98 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 150 }}
                  style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow]}
                >
                  {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: theme.mint }]}>
                      <Bot color={theme.primary} size={15} />
                    </View>
                  )}
                  <View style={{ maxWidth: '82%', position: 'relative' }}>
                    {item.imageUri && (
                      <Image source={{ uri: item.imageUri }} style={styles.msgImage} resizeMode="cover" />
                    )}

                    {isUser ? (
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.bubble, styles.userBubble]}
                      >
                        <Text style={styles.userText}>{item.text}</Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.bubble,
                          styles.aiBubble,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <Markdown style={mdStyles(isDarkMode, theme) as any}>{item.text}</Markdown>

                        <TouchableOpacity
                          style={styles.copyBtn}
                          onPress={() => copyToClipboard(item.text, item.id)}
                          activeOpacity={0.6}
                        >
                          {hasCopied ? (
                            <Check color={theme.primary} size={12} />
                          ) : (
                            <Copy color={theme.textLight} size={12} />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={[styles.timeText, { color: theme.textLight, textAlign: isUser ? 'right' : 'left' }]}>
                      {formatTime(item.time)}
                    </Text>
                  </View>
                </MotiView>
              );
            }}
            contentContainerStyle={[styles.chatArea, { paddingTop: 12, paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              isLoading ? (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={[styles.msgRow, styles.aiRow]}>
                  <View style={[styles.avatar, { backgroundColor: theme.mint }]}>
                    <Bot color={theme.primary} size={15} />
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      styles.typingBubble,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.typingContainer}>
                      {[0, 1, 2].map((i) => (
                        <MotiView
                          key={i}
                          from={{ translateY: 0 }}
                          animate={{ translateY: -5 }}
                          transition={{
                            type: 'timing',
                            duration: 400,
                            loop: true,
                            delay: i * 120,
                            repeatReverse: true,
                          }}
                          style={[styles.typingDot, { backgroundColor: theme.primary }]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.typingLabel, { color: theme.textLight }]}>AgriNex is thinking...</Text>
                  </View>
                </MotiView>
              ) : null
            }
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.welcomeContainer}>
                  {/* Premium Compact AI Welcome Card */}
                  <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.welcomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                      Hello {user?.full_name || 'Farmer'}! 🌾
                    </Text>
                    <Text style={[styles.welcomeSubtitle, { color: theme.textLight }]}>
                      I’m AgriNex AI Assistant. Ask anything about crops, fertilizers, diseases, irrigation, or organic
                      farming.
                    </Text>

                    {/* Quick action buttons */}
                    <View style={styles.quickActionsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.quickActionButton,
                          { backgroundColor: theme.mint, borderColor: theme.primary + '30' },
                        ]}
                        onPress={() => handleSend('Describe crop leaf blight disease detection and organic solutions. 🍂')}
                        activeOpacity={0.7}
                      >
                        <Sparkles color={theme.primary} size={13} />
                        <Text style={[styles.quickActionText, { color: theme.primary }]}>Crop Disease</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.quickActionButton,
                          { backgroundColor: theme.mint, borderColor: theme.primary + '30' },
                        ]}
                        onPress={() => handleSend('What are the best organic fertilizers for tomato yields? 🍅')}
                        activeOpacity={0.7}
                      >
                        <Sparkles color={theme.primary} size={13} />
                        <Text style={[styles.quickActionText, { color: theme.primary }]}>Fertilizer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.quickActionButton,
                          { backgroundColor: theme.mint, borderColor: theme.primary + '30' },
                        ]}
                        onPress={() => handleSend('Provide top organic weed prevention tips. 🌱')}
                        activeOpacity={0.7}
                      >
                        <Sparkles color={theme.primary} size={13} />
                        <Text style={[styles.quickActionText, { color: theme.primary }]}>Organic Tips</Text>
                      </TouchableOpacity>
                    </View>
                  </MotiView>
                </View>
              ) : null
            }
          />

          {/* Suggested quick question chips positioned perfectly above floating composer */}
          <View style={styles.suggestionsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScrollContent}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleSend(s)}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={isDarkMode ? ['rgba(16,185,129,0.15)', 'rgba(5,150,105,0.05)'] : ['#ECFDF5', '#F0FDF4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.suggestionGrad}
                  >
                    <Text style={[styles.suggestionChipText, { color: theme.text }]}>{s}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Dynamic input composer with height offsets to prevent tab bar overlapping */}
          <View style={[styles.inputContainer, { paddingBottom: isKeyboardActive ? 12 : 106 }]}>
            {selectedImage && (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.imgPreview, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.previewLabel, { color: theme.text }]} numberOfLines={1}>
                    Selected Crop Leaf
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textLight }}>Ready to scan & analyze</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImg} activeOpacity={0.6}>
                  <X color="#EF4444" size={18} />
                </TouchableOpacity>
              </MotiView>
            )}

            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => {
                  Alert.alert(
                    'Attach Photo',
                    'Choose image source for crop leaf analysis:',
                    [
                      { text: 'Take Photo (Camera)', onPress: () => pickImage('camera') },
                      { text: 'Choose from Gallery', onPress: () => pickImage('library') },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                activeOpacity={0.6}
              >
                <Camera color={theme.textLight} size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.attachBtn, { marginRight: 4 }]}
                onPress={handleLanguageCycle}
                activeOpacity={0.6}
              >
                <Globe color={selectedLanguage !== 'English' ? theme.primary : theme.textLight} size={20} />
              </TouchableOpacity>

              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Ask AgriNex AI..."
                placeholderTextColor={theme.textLight + '90'}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={1000}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtnPremium,
                  { backgroundColor: input.trim() || selectedImage ? theme.primary : theme.border },
                ]}
                onPress={() => handleSend()}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                activeOpacity={0.7}
              >
                <Send color="#fff" size={14} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* ChatGPT-Style LEFT Slide Drawer Sidebar */}
      <Modal visible={sidebarOpen} animationType="none" transparent={true} onRequestClose={() => setSidebarOpen(false)}>
        <View style={styles.sidebarContainer}>
          <Pressable style={styles.sidebarBackdrop} onPress={() => setSidebarOpen(false)}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: 0.55 }]} />
          </Pressable>

          <MotiView
            from={{ translateX: -280 }}
            animate={{ translateX: 0 }}
            transition={{ type: 'timing', duration: 220 }}
            style={[styles.sidebarDrawer, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF' }]}
          >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <View style={[styles.sidebarHeader, { borderBottomColor: theme.border }]}>
                <View style={styles.sidebarBrand}>
                  <Sparkles color={theme.primary} size={20} />
                  <Text style={[styles.sidebarBrandText, { color: theme.text }]}>AgriNex AI</Text>
                </View>
                <TouchableOpacity style={styles.sidebarClose} onPress={() => setSidebarOpen(false)}>
                  <X color={theme.text} size={18} />
                </TouchableOpacity>
              </View>

              {/* + New Chat CTA */}
              <View style={styles.sidebarActions}>
                <TouchableOpacity
                  style={[styles.sidebarNewBtn, { backgroundColor: theme.primary }]}
                  onPress={handleNewChat}
                  activeOpacity={0.7}
                >
                  <Plus color="#fff" size={16} />
                  <Text style={styles.sidebarNewText}>New Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Elegant Chat Search Bar */}
              <View style={styles.searchBarWrapper}>
                <View style={[styles.searchBar, { backgroundColor: theme.border }]}>
                  <Search color={theme.textLight} size={14} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search chats..."
                    placeholderTextColor={theme.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X color={theme.textLight} size={14} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Scrollable Grouped Past Chats */}
              <ScrollView style={styles.sidebarList} showsVerticalScrollIndicator={false}>
                {Object.keys(groupedConvs).map((groupName) => {
                  const list = groupedConvs[groupName];
                  if (list.length === 0) return null;

                  return (
                    <View key={groupName} style={styles.sidebarGroup}>
                      <Text style={[styles.sidebarGroupTitle, { color: theme.textLight }]}>{groupName}</Text>
                      {list.map((c) => {
                        const isActive = c.id === activeConversationId;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.sidebarItem, isActive && { backgroundColor: theme.mint }]}
                            onPress={() => selectConversation(c.id)}
                            delayLongPress={600}
                          >
                            <MessageSquare color={isActive ? theme.primary : theme.textLight} size={16} />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.sidebarItemText,
                                  { color: isActive ? theme.primary : theme.text },
                                  isActive && { fontWeight: '700' },
                                ]}
                                numberOfLines={1}
                              >
                                {c.title}
                              </Text>
                            </View>

                            {/* Rename Conversation Pencil Button */}
                            <TouchableOpacity
                              onPress={() => openRenameModal(c.id, c.title)}
                              style={styles.sidebarIconBtn}
                            >
                              <Pencil color={isActive ? theme.primary : theme.textLight} size={13} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDeleteConversation(c.id)}
                              style={styles.sidebarIconBtn}
                            >
                              <Trash2 color="#EF4444" size={13} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Footer Items */}
              <View style={[styles.sidebarFooter, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.footerLink}
                  onPress={() => {
                    setSidebarOpen(false);
                    router.push('/report-history');
                  }}
                  activeOpacity={0.7}
                >
                  <Bookmark color={theme.primary} size={16} />
                  <Text style={[styles.footerLinkText, { color: theme.text }]}>Diagnosis Reports</Text>
                  <ChevronRight color={theme.textLight} size={14} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerLink}
                  onPress={() => {
                    setSidebarOpen(false);
                    router.push('/(tabs)/profile');
                  }}
                  activeOpacity={0.7}
                >
                  <Settings color={theme.textLight} size={16} />
                  <Text style={[styles.footerLinkText, { color: theme.text }]}>Profile Settings</Text>
                  <ChevronRight color={theme.textLight} size={14} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerLink} onPress={handleLogout} activeOpacity={0.7}>
                  <LogOut color="#EF4444" size={16} />
                  <Text style={[styles.footerLinkText, { color: '#EF4444' }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </MotiView>
        </View>
      </Modal>

      {/* Elegant Rename Dialog Modal */}
      <Modal visible={renameModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Rename Conversation</Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
              placeholder="Enter new conversation name..."
              placeholderTextColor={theme.textLight}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleRenameSave}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ErrorBoundary>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RICH TYPOGRAPHY & MARKDOWN STYLINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const mdStyles = (isDark: boolean, theme: any) => ({
  body: {
    color: isDark ? '#E2E8F0' : '#334155',
    fontSize: 14.5,
    lineHeight: 21,
  },
  paragraph: {
    marginTop: 2,
    marginBottom: 6,
  },
  heading1: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '800' as const,
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 2,
  },
  heading2: {
    color: '#059669',
    fontSize: 14.2,
    fontWeight: '700' as const,
    marginTop: 8,
    marginBottom: 3,
  },
  heading3: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800' as const,
    marginTop: 6,
    marginBottom: 2,
  },
  strong: {
    fontWeight: '800' as const,
    color: '#059669',
  },
  bullet_list: {
    marginTop: 3,
    marginBottom: 5,
  },
  list_item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  bullet_list_icon: {
    color: theme.primary,
    fontSize: 14.5,
    marginRight: 4,
  },
  code_inline: {
    backgroundColor: isDark ? '#334155' : '#ECFDF5',
    color: theme.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12.5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Compact Sticky Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  hamburger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: { fontSize: 15.5, fontWeight: '700', textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1, justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10.5, fontWeight: '500' },
  clearBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  toastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Message Lists
  chatArea: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  userBubble: {
    borderBottomRightRadius: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBubble: {
    borderBottomLeftRadius: 3,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    paddingRight: 24,
  },
  userText: { fontSize: 14, color: '#FFFFFF', lineHeight: 19.5 },
  timeText: { fontSize: 9, marginTop: 3, marginHorizontal: 2 },
  msgImage: { width: 180, height: 135, borderRadius: 12, marginBottom: 4 },

  copyBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Typing state
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomLeftRadius: 3,
    minWidth: 120,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 24,
    height: 10,
  },
  typingDot: { width: 5, height: 5, borderRadius: 2.5 },
  typingLabel: { fontSize: 11.5, fontWeight: '500' },

  // Welcome card
  welcomeContainer: { paddingHorizontal: 4, marginVertical: 16 },
  welcomeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  welcomeTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  welcomeSubtitle: { fontSize: 13.5, lineHeight: 19, marginBottom: 16 },
  quickActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionText: { fontSize: 12.5, fontWeight: '700' },

  // Search input inside drawer
  searchBarWrapper: { paddingHorizontal: 14, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  // Image attachments preview bar
  imgPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 2,
  },
  previewThumb: { width: 40, height: 40, borderRadius: 8 },
  previewLabel: { fontSize: 12.5, fontWeight: '600' },
  removeImg: { padding: 4 },

  // Suggested Quick Chips above input bar
  suggestionsWrapper: { paddingVertical: 4 },
  suggestionsScrollContent: { paddingHorizontal: 14, gap: 8 },
  suggestionChip: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  suggestionGrad: { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  suggestionChipText: { fontSize: 12.5, fontWeight: '600' },

  // Bottom Floating Composer
  inputContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    paddingHorizontal: 8,
    borderWidth: 1,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    maxHeight: 90,
    paddingVertical: 6,
  },
  sendBtnPremium: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },

  // Sidebar ChatGPT Slide Modal
  sidebarContainer: { flex: 1, flexDirection: 'row' },
  sidebarBackdrop: { ...StyleSheet.absoluteFillObject },
  sidebarDrawer: {
    width: 270,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sidebarBrandText: { fontSize: 16, fontWeight: '800' },
  sidebarClose: { padding: 4 },
  sidebarActions: { padding: 14 },
  sidebarNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    gap: 6,
  },
  sidebarNewText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sidebarList: { flex: 1, paddingHorizontal: 10 },
  sidebarGroup: { marginBottom: 16 },
  sidebarGroupTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
    marginBottom: 6,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 8,
    marginBottom: 4,
  },
  sidebarItemText: { fontSize: 12.5, fontWeight: '600' },
  sidebarIconBtn: { padding: 4 },
  sidebarFooter: { padding: 10, borderTopWidth: 1, gap: 2 },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  footerLinkText: { flex: 1, fontSize: 13, fontWeight: '600' },

  // Modal Custom overlay styling for Rename dialog
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  modalInput: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
