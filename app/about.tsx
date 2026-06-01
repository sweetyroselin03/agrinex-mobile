import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Github, 
  Twitter, 
  Globe, 
  Mail, 
  Info, 
  ShieldCheck, 
  Users,
  Target,
  Zap,
  Leaf
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../hooks/useAppTheme';
import BrandLogo from '../components/BrandLogo';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const FeatureCard = ({ icon: Icon, title, desc }: any) => (
    <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.featureIcon, { backgroundColor: theme.mint }]}>
        <Icon size={24} color={theme.primary} />
      </View>
      <View style={styles.featureInfo}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.textLight }]}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About AgriNex</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[theme.primary + '20', 'transparent']}
            style={styles.heroGlow}
          />
          <BrandLogo size={100} animated={true} style={{ marginBottom: 16 }} isDarkMode={isDarkMode} />
          <Text style={[styles.appName, { color: theme.text }]}>AgriNex</Text>
          <Text style={[styles.version, { color: theme.textLight }]}>Version 2.0.4 Premium</Text>
          <Text style={[styles.tagline, { color: theme.primary }]}>Smart Farming. Better Future.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Our Mission</Text>
          <Text style={[styles.description, { color: theme.textLight }]}>
            AgriNex is dedicated to empowering modern farmers with intelligent technology. 
            Our platform bridges the gap between traditional wisdom and cutting-edge data science 
            to ensure sustainable, high-yield agriculture for a growing world.
          </Text>
        </View>

        <Text style={[styles.sectionHeading, { color: theme.text }]}>Key Features</Text>
        <FeatureCard 
          icon={Zap} 
          title="Disease Detection" 
          desc="Instantly identify crop diseases using high-accuracy vision technology." 
        />
        <FeatureCard 
          icon={Users} 
          title="Farmer Community" 
          desc="Connect with experts, share knowledge, and grow together." 
        />
        <FeatureCard 
          icon={Leaf} 
          title="Smart Insights" 
          desc="Personalized crop advice based on real-time soil and weather data." 
        />

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact & Support</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:support@agrinex.com')}>
            <Mail size={20} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>support@agrinex.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://agrinex.com')}>
            <Globe size={20} color={theme.primary} />
            <Text style={[styles.contactText, { color: theme.text }]}>www.agrinex.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Twitter size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Github size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerText, { color: theme.textLight }]}>
          © 2026 AgriNex Platform. All rights reserved. Made with love for farmers.
        </Text>
        
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    width: width,
    height: 300,
    zIndex: -1,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  version: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 10,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
    marginBottom: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    marginBottom: 32,
  },
  socialBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    opacity: 0.8,
    paddingHorizontal: 20,
  },
});
