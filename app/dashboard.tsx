import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight
} from 'lucide-react-native';
import BottomNav from '../components/BottomNav';
import { MotiView } from 'moti';
import { useAuthStore } from '../store/useAuthStore';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#071226', '#0B1730']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
          >
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>{user ? user.full_name || user.email || 'Farmer John' : 'Farmer John'}</Text>
          </MotiView>
          <TouchableOpacity style={styles.notificationBtn}>
            <View style={styles.dot} />
            <AlertCircle color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Weather Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.weatherCard}
        >
          <BlurView intensity={30} tint="dark" style={styles.weatherBlur}>
            <View style={styles.weatherMain}>
              <View>
                <Text style={styles.temp}>28°C</Text>
                <Text style={styles.weatherStatus}>Partly Cloudy</Text>
              </View>
              <CloudRain color="#10B981" size={56} />
            </View>
            
            <View style={styles.weatherStats}>
              <View style={styles.statItem}>
                <Droplets color="#9ca3af" size={16} />
                <Text style={styles.statLabel}>65% Humidity</Text>
              </View>
              <View style={styles.statItem}>
                <Wind color="#9ca3af" size={16} />
                <Text style={styles.statLabel}>12 km/h Wind</Text>
              </View>
              <View style={styles.statItem}>
                <Thermometer color="#9ca3af" size={16} />
                <Text style={styles.statLabel}>Feels like 30°</Text>
              </View>
            </View>
          </BlurView>
        </MotiView>

        {/* Analytics Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Farm Analytics</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
            style={styles.gridCard}
          >
            <View style={styles.cardHeader}>
              <TrendingUp color="#10B981" size={20} />
              <ArrowUpRight color="#9ca3af" size={16} />
            </View>
            <Text style={styles.cardValue}>92%</Text>
            <Text style={styles.cardLabel}>Crop Health</Text>
          </MotiView>

          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 }}
            style={styles.gridCard}
          >
            <View style={styles.cardHeader}>
              <Droplets color="#3B82F6" size={20} />
              <ArrowUpRight color="#9ca3af" size={16} />
            </View>
            <Text style={styles.cardValue}>45%</Text>
            <Text style={styles.cardLabel}>Soil Moisture</Text>
          </MotiView>
        </View>

        {/* AI Insight Banner */}
        <TouchableOpacity style={styles.insightBanner}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightInner}
          >
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>AI Recommendation</Text>
              <Text style={styles.insightText}>
                Based on current weather, we recommend irrigation in Section B today.
              </Text>
            </View>
            <View style={styles.insightIcon}>
              <TrendingUp color="#10B981" size={24} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071226',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
  },
  userName: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    zIndex: 1,
  },
  weatherCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weatherBlur: {
    padding: 24,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  temp: {
    color: 'white',
    fontSize: 48,
    fontWeight: '800',
  },
  weatherStatus: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '600',
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  gridCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  insightBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  insightInner: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    paddingRight: 12,
  },
  insightTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
