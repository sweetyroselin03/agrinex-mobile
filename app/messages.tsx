import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const MessageItem = ({ name, msg, time, unread, avatar }: any) => (
  <TouchableOpacity style={styles.messageItem}>
    <View style={styles.avatarContainer}>
      <Image source={{ uri: avatar }} style={styles.avatar} />
      <View style={styles.onlineIndicator} />
    </View>
    <View style={styles.messageContent}>
      <View style={styles.messageHeader}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.messageFooter}>
        <Text style={styles.preview} numberOfLines={1}>{msg}</Text>
        {unread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>1</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

export default function Messages() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MoreVertical size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput 
            placeholder="Search farmers..." 
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Active Now */}
      <View style={styles.activeSection}>
        <Text style={styles.sectionTitle}>Active Now</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeScroll}>
          {[1,2,3,4,5].map((i) => (
            <View key={i} style={styles.activeItem}>
              <View style={styles.activeAvatarWrapper}>
                <Image source={{ uri: `https://i.pravatar.cc/150?u=active${i}` }} style={styles.activeAvatar} />
                <View style={styles.activeIndicator} />
              </View>
              <Text style={styles.activeName}>Farmer {i}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Message List */}
      <View style={styles.listSection}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <MessageItem 
            name="Ramesh Kumar" 
            msg="The wheat crop is looking great this season!" 
            time="2m ago" 
            unread={true} 
            avatar="https://i.pravatar.cc/150?u=1" 
          />
          <MessageItem 
            name="Suresh Singh" 
            msg="Did you try the new AI scan feature?" 
            time="1h ago" 
            unread={false} 
            avatar="https://i.pravatar.cc/150?u=2" 
          />
          <MessageItem 
            name="Market Agent" 
            msg="Current price for soybean is 4500/quintal" 
            time="3h ago" 
            unread={false} 
            avatar="https://i.pravatar.cc/150?u=3" 
          />
          <MessageItem 
            name="AgriNexus Help" 
            msg="Welcome to the future of farming!" 
            time="Yesterday" 
            unread={false} 
            avatar="https://i.pravatar.cc/150?u=4" 
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071226',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    marginLeft: 12,
    fontSize: 16,
  },
  activeSection: {
    marginTop: 32,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '800',
    paddingHorizontal: 24,
    marginBottom: 16,
    fontSize: 18,
  },
  activeScroll: {
    paddingHorizontal: 24,
  },
  activeItem: {
    marginRight: 24,
    alignItems: 'center',
  },
  activeAvatarWrapper: {
    position: 'relative',
  },
  activeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#10B981',
    padding: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#071226',
    borderRadius: 8,
  },
  activeName: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  listSection: {
    marginTop: 32,
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#071226',
    borderRadius: 7,
  },
  messageContent: {
    flex: 1,
    marginLeft: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  time: {
    color: '#64748B',
    fontSize: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  preview: {
    color: '#64748B',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    borderRadius: 10,
    height: 20,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
});
