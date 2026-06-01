import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HelpCircle, Mail, Globe, Shield } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export default function ModalScreen() {
  const { isDarkMode, theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.mint }]}>
          <HelpCircle color={theme.primary} size={40} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>AgriNex Support</Text>
        <Text style={[styles.subtitle, { color: theme.textLight }]}>How can we help you today?</Text>
        <View style={styles.infoRow}>
          <Mail color={theme.primary} size={20} />
          <Text style={[styles.infoText, { color: theme.text }]}>support@agrinex.ai</Text>
        </View>
        <View style={styles.infoRow}>
          <Globe color={theme.primary} size={20} />
          <Text style={[styles.infoText, { color: theme.text }]}>www.agrinex.ai/help</Text>
        </View>
        <View style={styles.infoRow}>
          <Shield color={theme.primary} size={20} />
          <Text style={[styles.infoText, { color: theme.text }]}>Version 2.0.4 (Stable)</Text>
        </View>
      </View>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
  },
});