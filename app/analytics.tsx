import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Activity, 
  PieChart, 
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../hooks/useAppTheme';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

export default function Analytics() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const METRICS = [
    { title: 'Total Yield', value: '45.2 Tons', change: '+12%', up: true, color: theme.primary },
    { title: 'Total Revenue', value: '₹12.45L', change: '+8.4%', up: true, color: '#3B82F6' },
    { title: 'Op. Cost', value: '₹3.20L', change: '-2.1%', up: false, color: theme.error },
    { title: 'Efficiency', value: '92%', change: '+5%', up: true, color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.background }]}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Farm Analytics</Text>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.mint }]}>
          <Filter color={theme.primary} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Date Selector */}
        <View style={[styles.dateSelector, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Calendar size={18} color={theme.textLight} />
          <Text style={[styles.dateText, { color: theme.textLight }]}>Jan 2026 - May 2026</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.metricsGrid}>
          {METRICS.map((item, idx) => (
            <MotiView
              key={idx}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: idx * 100 }}
              style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.metricDot, { backgroundColor: item.color }]} />
              <Text style={[styles.metricTitle, { color: theme.textLight }]}>{item.title}</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{item.value}</Text>
              <View style={styles.changeRow}>
                {item.up ? (
                  <TrendingUp size={14} color={theme.success} />
                ) : (
                  <TrendingDown size={14} color={theme.error} />
                )}
                <Text style={[styles.changeText, { color: item.up ? theme.success : theme.error }]}>
                  {item.change}
                </Text>
              </View>
            </MotiView>
          ))}
        </View>

        {/* Chart Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Yield Projection</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.chartPlaceholder}>
              <LinearGradient
                colors={[theme.primary, '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chartLine}
              />
              <View style={styles.chartPoints}>
                {[40, 60, 45, 80, 55, 90].map((h, i) => (
                  <View key={i} style={[styles.chartBar, { height: h, backgroundColor: theme.mint, borderColor: theme.primary + '30' }]} />
                ))}
              </View>
            </View>
            <View style={[styles.chartAxis, { borderTopColor: theme.border }]}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
                <Text key={m} style={[styles.axisText, { color: theme.textLight }]}>{m}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Allocation Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Resource Allocation</Text>
          <View style={[styles.allocationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.allocationRow}>
              <View style={styles.allocationItem}>
                <View style={[styles.allocCircle, { backgroundColor: theme.primary }]} />
                <Text style={[styles.allocLab, { color: theme.textLight }]}>Water (42%)</Text>
              </View>
              <View style={styles.allocationItem}>
                <View style={[styles.allocCircle, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.allocLab, { color: theme.textLight }]}>Fertilizer (35%)</Text>
              </View>
              <View style={styles.allocationItem}>
                <View style={[styles.allocCircle, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.allocLab, { color: theme.textLight }]}>Others (23%)</Text>
              </View>
            </View>
            <View style={[styles.allocBar, { backgroundColor: theme.background }]}>
              <View style={{ width: '42%', height: '100%', backgroundColor: theme.primary }} />
              <View style={{ width: '35%', height: '100%', backgroundColor: '#3B82F6' }} />
              <View style={{ width: '23%', height: '100%', backgroundColor: '#F59E0B' }} />
            </View>
          </View>
        </View>

        {/* AI Insight */}
        <View style={[styles.aiInsightCard, { borderColor: theme.primary + '20' }]}>
          <LinearGradient
            colors={[theme.mint, isDarkMode ? '#1e293b' : '#F0F9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiGradient}
          >
            <View style={styles.aiHeader}>
              <Zap size={24} color={theme.primary} fill={theme.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.aiTitle, { color: theme.text }]}>Efficiency Score</Text>
                <Text style={[styles.aiSubtitle, { color: theme.textLight }]}>Top 5% in your region</Text>
              </View>
              <Text style={[styles.aiScore, { color: theme.primary }]}>94.5</Text>
            </View>
            <Text style={[styles.aiText, { color: theme.text }]}>
              Your resource management is highly efficient. To reach 98%, consider optimizing irrigation schedules for the Block B wheat crops.
            </Text>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '800',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  metricCard: {
    width: (width - 64) / 2,
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  metricTitle: {
    color: Colors.light.textLight,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '800',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chartPlaceholder: {
    height: 150,
    justifyContent: 'flex-end',
  },
  chartPoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    width: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  chartLine: {
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  axisText: {
    color: Colors.light.textLight,
    fontSize: 11,
    fontWeight: '700',
  },
  allocationCard: {
    backgroundColor: Colors.light.card,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allocCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allocLab: {
    color: Colors.light.textLight,
    fontSize: 11,
    fontWeight: '600',
  },
  allocBar: {
    height: 14,
    backgroundColor: '#F7FAFC',
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  aiInsightCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  aiGradient: {
    padding: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  aiSubtitle: {
    color: Colors.light.textLight,
    fontSize: 13,
  },
  aiScore: {
    color: '#10B981',
    fontSize: 32,
    fontWeight: '900',
  },
  aiText: {
    color: Colors.light.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
});
