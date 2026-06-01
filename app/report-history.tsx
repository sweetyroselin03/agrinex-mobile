import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Dimensions, TextInput, Alert, Share, StatusBar, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, Trash2, Share2, Filter, ChevronDown,
  Leaf, AlertTriangle, CheckCircle2, X, Calendar, Star
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import { useAppTheme } from '../hooks/useAppTheme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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

type SortOption = 'newest' | 'oldest' | 'severity';
type FilterOption = 'all' | 'favorites' | 'healthy' | 'warning' | 'critical';

export default function ReportHistory() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const [scans, setScans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadScans = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('scan_history');
      if (raw) setScans(JSON.parse(raw));
      else setScans([]);
    } catch { setScans([]); }
  }, []);

  useEffect(() => { loadScans(); }, [loadScans]);

  const deleteScan = async (id: string) => {
    Alert.alert('Delete Report', 'Are you sure you want to delete this scan report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const updated = scans.filter(s => s.id !== id);
          setScans(updated);
          await AsyncStorage.setItem('scan_history', JSON.stringify(updated));
        }
      }
    ]);
  };

  const toggleFavorite = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = scans.map(s => {
      if (s.id === id) {
        return { ...s, isFavorite: !s.isFavorite };
      }
      return s;
    });
    setScans(updated);
    await AsyncStorage.setItem('scan_history', JSON.stringify(updated));
  };

  const shareScan = async (scan: any) => {
    try {
      await Share.share({
        message: `🌱 AgriNex Crop Scan Report\n\n🔬 Disease: ${scan.result?.disease_name}\n📊 Confidence: ${scan.result?.confidence}%\n${getSeverityEmoji(scan.result?.severity_level)} Severity: ${scan.result?.severity_level}\n📅 Date: ${new Date(scan.date).toLocaleDateString()}\n\n💊 Treatment: ${scan.result?.treatment || 'N/A'}\n🌿 Organic: ${scan.result?.organic_treatment || 'N/A'}\n\nScanned with AgriNex AI 🚀`,
      });
    } catch (e) { console.error(e); }
  };

  // Filter + search + sort pipeline
  const filteredScans = scans
    .filter(s => {
      if (filterBy === 'favorites' && !s.isFavorite) return false;
      if (filterBy !== 'all' && filterBy !== 'favorites' && s.result?.severity_level?.toLowerCase() !== filterBy) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.result?.disease_name?.toLowerCase().includes(q) ||
          s.result?.severity_level?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      // severity: critical > warning > healthy
      const sev = { critical: 3, warning: 2, healthy: 1 };
      return (sev[b.result?.severity_level?.toLowerCase() as keyof typeof sev] || 0)
           - (sev[a.result?.severity_level?.toLowerCase() as keyof typeof sev] || 0);
    });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filterOptions: { label: string; value: FilterOption; color: string }[] = [
    { label: 'All', value: 'all', color: theme.primary },
    { label: '⭐ Favorites', value: 'favorites', color: '#F59E0B' },
    { label: '🟢 Healthy', value: 'healthy', color: '#10B981' },
    { label: '🟡 Warning', value: 'warning', color: '#F59E0B' },
    { label: '🔴 Critical', value: 'critical', color: '#EF4444' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
            <ArrowLeft color={theme.text} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Scan Reports</Text>
            <Text style={[styles.headerSub, { color: theme.textLight }]}>{filteredScans.length} report{filteredScans.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterBtn, { backgroundColor: showFilters ? theme.primary : theme.card }]}
          >
            <Filter color={showFilters ? '#fff' : theme.text} size={18} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search color={theme.textLight} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by disease or severity..."
            placeholderTextColor={theme.textLight + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={theme.textLight} size={16} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              style={styles.filtersRow}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {filterOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setFilterBy(opt.value)}
                    style={[styles.filterChip, {
                      backgroundColor: filterBy === opt.value ? opt.color + '20' : theme.card,
                      borderColor: filterBy === opt.value ? opt.color : theme.border,
                    }]}
                  >
                    <Text style={[styles.filterChipText, { color: filterBy === opt.value ? opt.color : theme.textLight }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.sortDivider} />
                {(['newest', 'oldest', 'severity'] as SortOption[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSortBy(s)}
                    style={[styles.filterChip, {
                      backgroundColor: sortBy === s ? theme.primary + '20' : theme.card,
                      borderColor: sortBy === s ? theme.primary : theme.border,
                    }]}
                  >
                    <Text style={[styles.filterChipText, { color: sortBy === s ? theme.primary : theme.textLight }]}>
                      {s === 'newest' ? '🕐 Newest' : s === 'oldest' ? '📅 Oldest' : '⚡ Severity'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Reports List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
          {filteredScans.length === 0 ? (
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
                <Leaf color={theme.primary} size={40} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Reports Found</Text>
              <Text style={[styles.emptyDesc, { color: theme.textLight }]}>
                {searchQuery ? 'Try a different search term.' : 'Scan your crops to start building your disease history.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/(tabs)/scan')}
              >
                <Text style={styles.emptyBtnText}>Start Scanning</Text>
              </TouchableOpacity>
            </MotiView>
          ) : (
            filteredScans.map((scan, index) => {
              const sColor = getSeverityColor(scan.result?.severity_level);
              const isFav = scan.isFavorite === true;

              return (
                <MotiView
                  key={scan.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: index * 80 }}
                  style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  {/* Image + Severity strip */}
                  <View style={styles.reportImageWrapper}>
                    <Image source={{ uri: scan.imageUri }} style={styles.reportImage} resizeMode="cover" />
                    <View style={[styles.severityStrip, { backgroundColor: sColor }]}>
                      <Text style={styles.severityStripText}>{scan.result?.severity_level || 'N/A'}</Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.reportBody}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.reportDisease, { color: theme.text }]} numberOfLines={1}>
                        {scan.result?.disease_name || 'Unknown'}
                      </Text>
                      {/* Favorites Toggle Star */}
                      <TouchableOpacity onPress={() => toggleFavorite(scan.id)} style={styles.starBtn}>
                        <Star color={isFav ? '#F59E0B' : theme.textLight} fill={isFav ? '#F59E0B' : 'transparent'} size={18} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.reportMetaRow}>
                      <Text style={[styles.reportConfidence, { color: sColor }]}>
                        {scan.result?.confidence}% confident
                      </Text>
                      <View style={styles.dotSeparator} />
                      <View style={styles.dateRow}>
                        <Calendar color={theme.textLight} size={11} />
                        <Text style={[styles.reportDate, { color: theme.textLight }]}>
                          {formatDate(scan.date)}
                        </Text>
                      </View>
                    </View>

                    {/* Quick Treatment Summary */}
                    {scan.result?.treatment && (
                      <Text style={[styles.reportTreatment, { color: theme.textLight }]} numberOfLines={2}>
                        💊 {scan.result.treatment}
                      </Text>
                    )}

                    {/* Actions */}
                    <View style={styles.reportActions}>
                      <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: '#25D36615' }]} onPress={() => shareScan(scan)}>
                        <Share2 color="#25D366" size={14} />
                        <Text style={[styles.reportActionText, { color: '#25D366' }]}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.reportActionBtn, { backgroundColor: '#EF444415' }]} onPress={() => deleteScan(scan.id)}>
                        <Trash2 color="#EF4444" size={14} />
                        <Text style={[styles.reportActionText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </MotiView>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  filterBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 16, height: 48, borderRadius: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  filtersRow: { marginBottom: 8 },
  filtersScroll: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  sortDivider: {
    width: 1, height: 24, backgroundColor: 'rgba(100,116,139,0.3)',
    marginHorizontal: 4, alignSelf: 'center',
  },
  listContainer: { paddingHorizontal: 20, paddingTop: 4 },
  // Empty State
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 40 },
  emptyBtn: { height: 48, paddingHorizontal: 32, borderRadius: 14, justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Report Card
  reportCard: {
    flexDirection: 'row', borderRadius: 20, borderWidth: 1,
    marginBottom: 14, overflow: 'hidden',
  },
  reportImageWrapper: { width: 100, position: 'relative' },
  reportImage: { width: '100%', height: '100%', minHeight: 130 },
  severityStrip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 3, alignItems: 'center',
  },
  severityStripText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  reportBody: { flex: 1, padding: 14, gap: 6 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  reportDisease: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  starBtn: {
    padding: 4,
  },
  reportMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportConfidence: { fontSize: 12, fontWeight: '700' },
  dotSeparator: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#64748B' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reportDate: { fontSize: 11, fontWeight: '600' },
  reportTreatment: { fontSize: 12, lineHeight: 17 },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reportActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  reportActionText: { fontSize: 11, fontWeight: '700' },
});
