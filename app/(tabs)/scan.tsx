import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions,
  ActivityIndicator, Alert, ScrollView, Platform, Share,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  X, Zap, Image as ImageIcon, Droplet, AlertTriangle, CheckCircle2,
  Info, RefreshCw, FlaskConical, Circle, Shield, Bug, Bookmark, Share2, MessageCircle,
  CloudRain, Leaf,
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useRouter } from 'expo-router';
import { analyzeImage, getDiseaseColor, getConfidenceLabel, getSeverityColor, getSeverityEmoji, DiseaseResult } from '../../services/diseaseDetection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function ScanTab() {
  const router = useRouter();
  const { isDarkMode, theme } = useAppTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiseaseResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;

  // ─── resetScan function (was missing — caused crash) ───
  const resetScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImage(null);
    setAnalysis(null);
    setSaved(false);
    setIsScanning(false);
    setScanProgress(0);
  };

  const takePhoto = async () => {
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan crops.');
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsScanning(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          skipProcessing: false,
        });
        handleAnalyze(photo.uri);
      } catch (error) {
        console.error('Capture failed', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
        setIsScanning(false);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleAnalyze(result.assets[0].uri);
    }
  };

  const handleAnalyze = async (uri: string) => {
    setImage(uri);
    setShowCamera(false);
    setIsScanning(true);
    setAnalysis(null);
    setSaved(false);
    setScanProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const result = await analyzeImage(uri);
      clearInterval(progressInterval);
      setScanProgress(100);
      setAnalysis(result);
      if (result.is_valid_crop === false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Analysis failed', error);
      Alert.alert('Analysis Failed', 'Unable to analyze image. Please check your connection and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !image) return;
    try {
      const historyRaw = await AsyncStorage.getItem('scan_history');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      history.unshift({
        id: Date.now().toString(),
        imageUri: image,
        result: analysis,
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem('scan_history', JSON.stringify(history.slice(0, 50)));
      setSaved(true);
      
      // Haptics and premium visual checkmark confirmation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save.');
    }
  };

  const handleShare = async () => {
    if (!analysis) return;
    try {
      await Share.share({
        message: `🌱 AgriNex AI Crop Scan Result\n\n🔬 Disease: ${analysis.disease_name}\n📊 Confidence: ${analysis.confidence}%\n${getSeverityEmoji(analysis.severity_level)} Severity: ${analysis.severity_level}\n\n💊 Treatment: ${analysis.treatment}\n🌿 Organic: ${analysis.organic_treatment}\n\nScanned with AgriNex AI 🚀`,
      });
    } catch (e) { console.error(e); }
  };

  const handleAskAI = () => {
    if (!analysis) return;
    router.push('/(tabs)/chat');
  };

  // Main Return with AnimatePresence for smooth transitions
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <AnimatePresence>
        {showCamera ? (
          <MotiView 
            key="camera"
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.cameraContainer}
          >
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
            >
              <SafeAreaView style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <TouchableOpacity 
                    style={styles.closeBtn} 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowCamera(false);
                    }}
                  >
                    <X color="white" size={30} />
                  </TouchableOpacity>
                  <View style={styles.cameraHeaderActions}>
                    <TouchableOpacity style={styles.iconBtn}>
                      <Zap color="white" size={24} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.scanAreaContainer}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                    
                    <MotiView
                      from={{ translateY: 0, opacity: 0.5 }}
                      animate={{ translateY: width * 0.7, opacity: 0.8 }}
                      transition={{ loop: true, duration: 2000, type: 'timing' }}
                      style={styles.scanLine}
                    />
                  </View>
                  <Text style={styles.scanTipText}>Align crop within the frame</Text>
                  <View style={styles.cameraGuideOverlay}>
                    <Text style={styles.cameraGuideText}>🌿 Leaf  •  🍎 Fruit  •  🌾 Stem  •  🔍 Spot</Text>
                  </View>
                </View>

                <View style={styles.cameraFooter}>
                  <TouchableOpacity style={styles.galleryBtnCam} onPress={() => { setShowCamera(false); pickImage(); }}>
                    <ImageIcon color="white" size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={isScanning}>
                    <View style={styles.captureBtnOuter}>
                      <View style={styles.captureBtnInner} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.infoBtnCam}>
                    <Info color="white" size={24} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </CameraView>
          </MotiView>
        ) : (
          <MotiView
            key="content"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ flex: 1 }}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Crop Health Scanner</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textLight }]}>AI-powered disease detection</Text>
              </View>

              {!image && !isScanning ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={[styles.uploadPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: theme.mint }]}>
                    <Zap color={theme.primary} size={48} fill={theme.primary} />
                  </View>
                  <Text style={[styles.uploadTitle, { color: theme.text }]}>Scan Your Crop</Text>
                  <Text style={[styles.uploadDesc, { color: theme.textLight }]}>
                    Take a clear photo of the infected area for instant AI analysis.
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: theme.primary }]} onPress={takePhoto}>
                      <Circle color="white" size={24} strokeWidth={3} />
                      <Text style={styles.mainActionText}>Use Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: theme.mint }]} onPress={pickImage}>
                      <ImageIcon color={theme.primary} size={24} />
                      <Text style={[styles.mainActionText, { color: theme.primary }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </MotiView>
              ) : (
                <View style={styles.resultContainer}>
                  {/* Image Preview */}
                  <View style={[styles.imagePreviewWrapper, { borderColor: theme.border }]}>
                    <Image source={{ uri: image! }} style={styles.imagePreview} resizeMode="cover" />
                    {isScanning && (
                      <View style={styles.scanningOverlay}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.scanningText}>AI Analyzing Crop...</Text>
                        <Text style={styles.scanProgressText}>{Math.round(scanProgress)}%</Text>
                        {/* Progress bar */}
                        <View style={styles.progressBarBg}>
                          <MotiView
                            animate={{ width: `${Math.min(scanProgress, 100)}%` as any }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={styles.progressBarFill}
                          />
                        </View>
                        <MotiView
                          from={{ translateY: -150 }}
                          animate={{ translateY: 150 }}
                          transition={{ loop: true, duration: 1500, type: 'timing' }}
                          style={styles.scanLineResult}
                        />
                      </View>
                    )}
                  </View>

                  {/* ─── Stage 2: Quality/Connection Error Screen ─── */}
                  {analysis && !isScanning && (analysis.disease_name === 'Quality Issue' || analysis.disease_name === 'Connection Error') && (
                    <MotiView
                      from={{ opacity: 0, scale: 0.9, translateY: 15 }}
                      animate={{ opacity: 1, scale: 1, translateY: 0 }}
                      transition={{ type: 'timing', duration: 400 }}
                      style={[styles.invalidScanCard, { borderColor: '#F59E0B', backgroundColor: isDarkMode ? '#1c1205' : '#FFFDF5' }]}
                    >
                      <View style={[styles.invalidIconRow, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                        <MotiView
                          from={{ rotate: '0deg' }}
                          animate={{ rotate: ['0deg', '10deg', '-10deg', '0deg'] }}
                          transition={{ loop: true, duration: 1500, type: 'timing' }}
                        >
                          <AlertTriangle color="#F59E0B" size={48} />
                        </MotiView>
                      </View>
                      <Text style={[styles.invalidTitle, { color: '#F59E0B' }]}>
                        {analysis.disease_name === 'Quality Issue' ? 'Low Quality Scan' : 'Connection Error'}
                      </Text>
                      <Text style={[styles.invalidMessage, { color: theme.textLight }]}>
                        {analysis.disease_name === 'Quality Issue' 
                          ? 'Image quality too low. Move closer and scan in proper lighting.' 
                          : 'Server connection timed out. Please check your connection and try again.'}
                      </Text>

                      {/* Diagnostic suggestions */}
                      <View style={[styles.cropGuide, { borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.04)' }]}>
                        <Text style={[styles.cropGuideTitle, { color: '#D97706' }]}>Tips for a high quality scan:</Text>
                        <View style={{ gap: 8, marginTop: 4 }}>
                          <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }}>💡 Bring leaf into focus and crop closely</Text>
                          <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }}>☀️ Avoid heavy glare or dark shadows</Text>
                          <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }}>📱 Keep the camera steady (no motion blur)</Text>
                        </View>
                      </View>

                      <TouchableOpacity style={[styles.tryAgainBtn, { backgroundColor: '#F59E0B' }]} onPress={resetScan}>
                        <RefreshCw color="#fff" size={18} />
                        <Text style={styles.tryAgainText}>Scan Again</Text>
                      </TouchableOpacity>
                    </MotiView>
                  )}

                  {/* ─── Stage 1: Invalid Scan Error Screen ─── */}
                  {analysis && !isScanning && analysis.is_valid_crop === false && analysis.disease_name !== 'Quality Issue' && (
                    <MotiView
                      from={{ opacity: 0, scale: 0.85, translateX: -12 }}
                      animate={{ opacity: 1, scale: 1, translateX: [12, -8, 6, -3, 0] }}
                      transition={{ type: 'spring', damping: 12 }}
                      style={[styles.invalidScanCard, { borderColor: '#EF4444', position: 'relative', overflow: 'hidden' }]}
                    >
                      {/* Blur Background behind card content */}
                      {Platform.OS !== 'android' && (
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                      )}
                      
                      <View style={styles.invalidIconRow}>
                        <MotiView
                          from={{ scale: 1 }}
                          animate={{ scale: [1, 1.18, 1] }}
                          transition={{ loop: true, duration: 1500, type: 'timing' }}
                        >
                          <AlertTriangle color="#EF4444" size={48} />
                        </MotiView>
                      </View>
                      <Text style={styles.invalidTitle}>Invalid Crop Scan</Text>
                      <Text style={styles.invalidMessage}>
                        This image does not contain a detectable crop or plant. Please scan a crop leaf, fruit, or plant clearly.
                      </Text>

                      {/* Rejection Detail */}
                      {analysis.detected_object && (
                        <View style={styles.rejectionTag}>
                          <Text style={styles.rejectionTagText}>Detected: {analysis.detected_object}</Text>
                        </View>
                      )}

                      {/* Crop Example Overlay / Guide */}
                      <View style={styles.cropGuide}>
                        <Text style={styles.cropGuideTitle}>Supported subjects to scan:</Text>
                        <View style={styles.cropGuideRow}>
                          {['🌿 Leaves', '🍎 Fruits', '🌾 Stems', '🍂 Plant Lesions', '🌱 Seedlings'].map((item, i) => (
                            <View key={i} style={styles.cropGuideItem}>
                              <Text style={styles.cropGuideText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Visual Align Overlay Guide */}
                      <View style={styles.alignGuideBox}>
                        <View style={styles.alignGuideFrame}>
                          <View style={styles.alignLeafBg}>
                            <Leaf color="#10B981" size={32} opacity={0.6} />
                          </View>
                        </View>
                        <Text style={styles.alignGuideText}>Position leaf inside scanner borders</Text>
                      </View>

                      <TouchableOpacity style={styles.tryAgainBtn} onPress={resetScan}>
                        <RefreshCw color="#fff" size={18} />
                        <Text style={styles.tryAgainText}>Scan Again</Text>
                      </TouchableOpacity>
                    </MotiView>
                  )}

                  {/* ─── Valid Analysis Result Card ─── */}
                  {analysis && !isScanning && analysis.is_valid_crop !== false && analysis.disease_name !== 'Quality Issue' && analysis.disease_name !== 'Connection Error' && (
                    <MotiView
                      from={{ opacity: 0, translateY: 20 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      style={[styles.analysisCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      {analysis.severity_level === 'Healthy' ? (
                        <View>
                          {/* Disease Header with Severity */}
                          <View style={styles.analysisHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.diseaseLabel, { color: '#10B981' }]}>HEALTH MONITOR</Text>
                              <Text style={[styles.diseaseTitleText, { color: theme.text }]} numberOfLines={2}>
                                {analysis.disease_name || 'Healthy Crop'}
                              </Text>
                            </View>
                            <View style={[styles.confidenceBadgePremium, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                              <Text style={[styles.confidenceTextPremium, { color: '#10B981' }]}>
                                {analysis.confidence}% Match
                              </Text>
                            </View>
                          </View>

                          {/* Health Score Circular Badge */}
                          <View style={[styles.healthScoreCard, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.06)' : '#ECFDF5', borderColor: 'rgba(16,185,129,0.15)' }]}>
                            <View style={styles.healthScoreCircle}>
                              <Text style={styles.healthScoreVal}>{analysis.health_score || 95}</Text>
                              <Text style={styles.healthScoreMax}>/100</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.healthScoreTitle, { color: theme.text }]}>Excellent Crop Health</Text>
                              <Text style={[styles.healthScoreDesc, { color: theme.textLight }]}>No pathogen traces or nutrient deficiencies detected.</Text>
                            </View>
                          </View>

                          {/* Report Sections */}
                          <View style={styles.reportSection}>
                            {[
                              { icon: Shield, label: 'Preventive Care Tips', val: analysis.prevention || analysis.prevention_tips, color: '#10B981' },
                              { icon: Droplet, label: 'Water Suggestion', val: analysis.irrigation_recommendations, color: '#3B82F6' },
                              { icon: Leaf, label: 'Growth Tips', val: analysis.fertilizer_recommendations, color: '#059669' },
                            ].filter(item => !!item.val).map((item, idx) => (
                              <View key={idx} style={styles.reportItem}>
                                <View style={[styles.reportIconBox, { backgroundColor: isDarkMode ? '#1e293b' : '#F1F5F9' }]}>
                                  <item.icon color={item.color} size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.reportLabel, { color: theme.textLight }]}>{item.label}</Text>
                                  <Text style={[styles.reportVal, { color: theme.text }]}>{item.val}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <View>
                          {/* Disease Header with Severity */}
                          <View style={styles.analysisHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.diseaseLabel, { color: getSeverityColor(analysis.severity_level) }]}>DIAGNOSED CONDITION</Text>
                              <Text style={[styles.diseaseTitleText, { color: theme.text }]} numberOfLines={2}>
                                {analysis.disease_name}
                              </Text>
                            </View>
                            <View style={[styles.confidenceBadgePremium, { backgroundColor: theme.mint }]}>
                              <Text style={[styles.confidenceTextPremium, { color: theme.primary }]}>
                                {analysis.confidence}% AI Match
                              </Text>
                            </View>
                          </View>

                          {/* Severity Badge */}
                          <View style={[styles.severityRow, { 
                            backgroundColor: isDarkMode ? '#1e293b' : '#F8FAFC',
                            borderColor: getSeverityColor(analysis.severity_level) + '30',
                          }]}>
                            <Text style={styles.severityEmoji}>{getSeverityEmoji(analysis.severity_level)}</Text>
                            <Text style={[styles.severityText, { color: getSeverityColor(analysis.severity_level) }]}>
                              {analysis.severity_level === 'Critical' ? 'Critical — Immediate Action Needed' :
                               analysis.severity_level === 'Warning' ? 'Warning — Monitor Closely' :
                               'Mild Infection'}
                            </Text>
                          </View>

                          {/* Report Sections */}
                          <View style={styles.reportSection}>
                            {[
                              { icon: Info, label: 'Symptoms', val: analysis.symptoms, color: theme.primary },
                              { icon: Bug, label: 'Causes', val: analysis.causes, color: '#F59E0B' },
                              { icon: CheckCircle2, label: 'Treatment', val: analysis.treatment, color: '#10B981' },
                              { icon: Shield, label: 'Organic Solution', val: analysis.organic_treatment, color: '#22C55E' },
                              { icon: AlertTriangle, label: 'Yield Impact', val: analysis.yield_impact, color: '#EF4444' },
                              { icon: Leaf, label: 'Pro Tips', val: analysis.pro_tips, color: '#8B5CF6' },
                            ].filter(item => !!item.val).map((item, idx) => (
                              <View key={idx} style={styles.reportItem}>
                                <View style={[styles.reportIconBox, { backgroundColor: isDarkMode ? '#1e293b' : '#F1F5F9' }]}>
                                  <item.icon color={item.color} size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.reportLabel, { color: theme.textLight }]}>{item.label}</Text>
                                  <Text style={[styles.reportVal, { color: theme.text }]}>{item.val}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Prevention Tips Section (Diseased only) */}
                      {analysis.severity_level !== 'Healthy' && analysis.prevention_tips && (
                        <View style={[styles.preventionSection, { backgroundColor: isDarkMode ? '#064E3B20' : '#ECFDF5' }]}>
                          <Text style={[styles.preventionTitle, { color: theme.primary }]}>🛡️ Prevention Tips</Text>
                          <Text style={[styles.preventionText, { color: theme.text }]}>{analysis.prevention_tips}</Text>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: saved ? theme.mint : theme.primary }]}
                          onPress={handleSave}
                          disabled={saved}
                        >
                          <Bookmark color={saved ? theme.primary : '#fff'} size={18} />
                          <Text style={[styles.actionBtnText, saved && { color: theme.primary }]}>
                            {saved ? 'Saved' : 'Save Report'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                          <Share2 color="#fff" size={18} />
                          <Text style={styles.actionBtnText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={handleAskAI}>
                          <MessageCircle color="#fff" size={18} />
                          <Text style={styles.actionBtnText}>Ask AI</Text>
                        </TouchableOpacity>
                      </View>

                      {/* New Scan */}
                      <TouchableOpacity style={[styles.resetBtn, { backgroundColor: theme.primary }]} onPress={resetScan}>
                        <RefreshCw color="white" size={20} />
                        <Text style={styles.resetBtnText}>New Scan</Text>
                      </TouchableOpacity>
                    </MotiView>
                  )}
                </View>
              )}

              {/* Tips */}
              <View style={[styles.tipsSection, { backgroundColor: theme.card }]}>
                <Text style={[styles.tipsTitle, { color: theme.text }]}>Tips for better scanning</Text>
                {[
                  'Ensure good lighting on the leaf/crop.',
                  'Keep the camera focused on the affected area.',
                  'Maintain a steady distance of 10-15cm.',
                ].map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    <CheckCircle2 color={theme.primary} size={16} />
                    <Text style={[styles.tipText, { color: theme.textLight }]}>{tip}</Text>
                  </View>
                ))}
              </View>

              <View style={{ height: 120 }} />
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Visual Save Success Confirmation Overlay */}
      <AnimatePresence>
        {showSaveSuccess && (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={styles.saveSuccessOverlay}
          >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <MotiView
              from={{ scale: 0.5, rotate: '-45deg' }}
              animate={{ scale: 1, rotate: '0deg' }}
              transition={{ type: 'spring', delay: 100 }}
              style={styles.saveSuccessCard}
            >
              <CheckCircle2 color="#10B981" size={64} />
              <Text style={styles.saveSuccessTitle}>Report Saved!</Text>
              <Text style={styles.saveSuccessSub}>Added to your Saved Reports history</Text>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  uploadPlaceholder: {
    borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed',
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  uploadTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  uploadDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  mainActionBtn: {
    flex: 1, height: 56, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 2,
  },
  mainActionText: { color: 'white', fontSize: 15, fontWeight: '700' },
  // Camera
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', paddingVertical: 20 },
  cameraHeader: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraHeaderActions: { flexDirection: 'row', gap: 16 },
  closeBtn: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanAreaContainer: { alignSelf: 'center', alignItems: 'center', gap: 20 },
  scanFrame: {
    width: width * 0.75, height: width * 0.75,
    borderRadius: 30, overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: '#10B981', borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 30 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 30 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 30 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 30 },
  scanLine: {
    width: '100%', height: 4, backgroundColor: '#10B981',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15,
  },
  scanTipText: { color: 'white', fontSize: 14, fontWeight: '600', opacity: 0.8 },
  cameraGuideOverlay: {
    marginTop: 8, backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  cameraGuideText: { color: '#6EE7B7', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cameraFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 40, paddingHorizontal: 40,
  },
  galleryBtnCam: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoBtnCam: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtn: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnOuter: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'white',
    padding: 4, justifyContent: 'center', alignItems: 'center',
  },
  captureBtnInner: {
    width: '100%', height: '100%', borderRadius: 32, borderWidth: 3, borderColor: '#064E3B',
  },
  // Results
  resultContainer: { gap: 24 },
  imagePreviewWrapper: {
    width: '100%', height: 300, borderRadius: 24, overflow: 'hidden', position: 'relative', borderWidth: 1,
  },
  imagePreview: { width: '100%', height: '100%' },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanningText: { color: 'white', fontSize: 18, fontWeight: '700', marginTop: 16 },
  scanProgressText: { color: '#10B981', fontSize: 24, fontWeight: '900', marginTop: 8 },
  progressBarBg: {
    width: '60%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 12, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: '#10B981', borderRadius: 3,
  },
  scanLineResult: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#10B981' },
  analysisCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  analysisHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  diseaseLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  diseaseTitleText: { fontSize: 19, fontWeight: '900', letterSpacing: -0.2 },
  confidenceBadgePremium: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  confidenceTextPremium: { fontSize: 13, fontWeight: '800' },
  diseaseBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, gap: 6, flex: 1,
  },
  diseaseName: { fontWeight: '700', fontSize: 13, flexShrink: 1 },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  // Severity
  severityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    marginBottom: 20, borderWidth: 1,
  },
  severityEmoji: { fontSize: 18 },
  severityText: { fontSize: 13, fontWeight: '700', flex: 1 },
  reportSection: { gap: 16, marginBottom: 20 },
  reportItem: { flexDirection: 'row', gap: 14 },
  reportIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reportLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  reportVal: { fontSize: 13, lineHeight: 19 },
  // Prevention
  preventionSection: {
    padding: 16, borderRadius: 16, marginBottom: 20,
  },
  preventionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  preventionText: { fontSize: 13, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1, height: 44, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  actionBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  resetBtn: {
    height: 52, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  resetBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  tipsSection: { marginTop: 32, padding: 24, borderRadius: 24 },
  tipsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipText: { fontSize: 14 },
  // ─── Invalid Scan Card ───
  invalidScanCard: {
    borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 2, borderColor: '#EF4444',
    backgroundColor: '#1a0505',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  invalidIconRow: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  invalidTitle: {
    fontSize: 22, fontWeight: '900', color: '#EF4444', marginBottom: 8,
  },
  invalidMessage: {
    fontSize: 14, color: '#CBD5E1', textAlign: 'center', lineHeight: 22, marginBottom: 20,
  },
  rejectionTag: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  rejectionTagText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cropGuide: {
    width: '100%', backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
  },
  cropGuideTitle: {
    fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cropGuideRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  cropGuideItem: {
    backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  cropGuideText: { fontSize: 13, color: '#6EE7B7', fontWeight: '600' },
  alignGuideBox: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  alignGuideFrame: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignLeafBg: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignGuideText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tryAgainBtn: {
    width: '100%', height: 52, borderRadius: 16,
    backgroundColor: '#EF4444', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  tryAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // ─── Save Success Visual Overlay ───
  saveSuccessOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  saveSuccessCard: {
    width: 280,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  saveSuccessTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 6,
  },
  saveSuccessSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Health Score Style
  healthScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  healthScoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  healthScoreVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  healthScoreMax: {
    fontSize: 10,
    color: '#10B981',
    opacity: 0.8,
    marginTop: 4,
  },
  healthScoreTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  healthScoreDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
