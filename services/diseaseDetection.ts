import client from '../api/client';
import * as FileSystem from 'expo-file-system/legacy';

export interface DiseaseResult {
  disease_name: string;
  confidence: number;
  severity_level: string;
  symptoms: string;
  causes: string;
  prevention: string;
  treatment: string;
  organic_treatment: string;
  pesticide_recommendations: string;
  irrigation_recommendations: string;
  fertilizer_recommendations: string;
  recovery_steps: string;
  estimated_recovery_time: string;
  weather_risk: string;
  prevention_tips: string;
  is_valid_crop?: boolean;
  detected_object?: string;
  rejection_reason?: string;
  quality_issue?: string;
  health_score?: number;
  yield_impact?: string;
  pro_tips?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAGE 2 — Image Quality Validation (Frontend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { Image as RNImage } from 'react-native';

async function validateImageQuality(imageUri: string): Promise<{ valid: boolean; issue?: string }> {
  try {
    const info = await FileSystem.getInfoAsync(imageUri, { size: true } as any);

    if (!info.exists) {
      return { valid: false, issue: 'Image file not found. Please try again.' };
    }

    // Check file size — too small likely means very low quality or extremely poor lighting
    const sizeKB = ((info as any).size || 0) / 1024;
    if (sizeKB < 5) {
      return { valid: false, issue: 'Image is too blurry or dark. Ensure good lighting and take the photo closer.' };
    }

    // Check if file size is suspiciously large
    const sizeMB = sizeKB / 1024;
    if (sizeMB > 25) {
      return { valid: false, issue: 'Image file size is too large.' };
    }

    // Aspect ratio check using react-native RNImage.getSize
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      RNImage.getSize(imageUri, (w, h) => resolve({ width: w, height: h }), (err) => reject(err));
    }).catch(() => null);

    if (dims) {
      const aspect = dims.width / dims.height;
      if (aspect < 0.45 || aspect > 2.2) {
        return { valid: false, issue: 'Invalid aspect ratio. Align the leaf centered inside the camera borders.' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.log('Quality validation error:', error);
    return { valid: true };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Analysis Function — Multi-Stage Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function analyzeImage(imageUri: string): Promise<DiseaseResult> {

  // ── STAGE 2: Image Quality Validation ──
  const quality = await validateImageQuality(imageUri);
  if (!quality.valid) {
    return {
      disease_name: 'Quality Issue',
      confidence: 0,
      severity_level: 'Warning',
      symptoms: quality.issue || 'Image quality too low.',
      causes: 'The captured image does not meet quality requirements for analysis.',
      prevention: 'Ensure good lighting and hold the camera steady.',
      treatment: '',
      organic_treatment: '',
      pesticide_recommendations: '',
      irrigation_recommendations: '',
      fertilizer_recommendations: '',
      recovery_steps: '',
      estimated_recovery_time: '',
      weather_risk: '',
      prevention_tips: '',
      is_valid_crop: false,
      quality_issue: quality.issue,
    };
  }

  // ── STAGE 1 + 3: Backend handles crop validation AND disease detection ──
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // 15-second timeout for two-stage scan requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await client.post('/ai/detect-disease', { image_url: dataUrl }, {
      signal: controller.signal,
      timeout: 18000,
    });

    clearTimeout(timeoutId);

    if (response.data && response.data.disease_name) {
      return {
        disease_name: response.data.disease_name || 'Unknown',
        confidence: parseFloat(response.data.confidence) || 85.0,
        severity_level: response.data.severity_level || 'Warning',
        symptoms: response.data.symptoms || 'Analysis pending',
        causes: response.data.causes || 'Under investigation',
        prevention: response.data.prevention || 'Consult local expert',
        treatment: response.data.treatment || response.data.recovery_steps || 'Consult agricultural expert',
        organic_treatment: response.data.organic_treatment || 'Neem oil spray recommended',
        pesticide_recommendations: response.data.pesticide_recommendations || 'Consult dealer',
        irrigation_recommendations: response.data.irrigation_recommendations || 'Maintain regular schedule',
        fertilizer_recommendations: response.data.fertilizer_recommendations || 'Balanced NPK',
        recovery_steps: response.data.recovery_steps || 'Follow treatment plan',
        estimated_recovery_time: response.data.estimated_recovery_time || '7-14 days',
        weather_risk: response.data.weather_risk || 'Monitor during high humidity',
        prevention_tips: response.data.prevention_tips || 'Regular monitoring recommended',
        is_valid_crop: response.data.is_valid_crop !== false,
        detected_object: response.data.detected_object,
        rejection_reason: response.data.rejection_reason,
        health_score: response.data.health_score,
        yield_impact: response.data.yield_impact,
        pro_tips: response.data.pro_tips,
      };
    }
    throw new Error('Invalid backend response');
  } catch (error: any) {
    console.log('Backend AI unavailable, trying fallback:', error?.message);
    try {
      console.log('[diseaseDetection] Triggering direct Groq Vision fallback...');
      const { analyzeCropImage: directAnalyze } = require('./groqService');
      const directResult = await directAnalyze(imageUri);
      return {
        disease_name: directResult.disease_name || 'Healthy Crop',
        confidence: directResult.confidence || 90.0,
        severity_level: directResult.severity_level || 'Healthy',
        symptoms: directResult.symptoms || 'No disease symptoms detected.',
        causes: 'Pathogenic infection or physiological disorder.',
        prevention: directResult.pro_tips || 'Maintain standard farm hygiene.',
        treatment: directResult.treatment || 'Apply target fungicides.',
        organic_treatment: directResult.organic_treatment || 'Apply organic neem oil.',
        pesticide_recommendations: directResult.treatment || '',
        irrigation_recommendations: directResult.irrigation_recommendations || 'Maintain normal irrigation.',
        fertilizer_recommendations: 'Apply balanced NPK nutrients.',
        recovery_steps: directResult.recovery_steps || 'Prune infected leaves and separate diseased crops.',
        estimated_recovery_time: '7-14 days',
        weather_risk: 'High risk during heavy moisture.',
        prevention_tips: directResult.pro_tips || 'Keep surveillance active.',
        is_valid_crop: directResult.is_valid_crop !== false,
        detected_object: directResult.crop_type,
        rejection_reason: directResult.rejection_reason,
        health_score: directResult.severity_level?.toLowerCase() === 'healthy' ? 95 : 65,
        yield_impact: directResult.yield_impact,
        pro_tips: directResult.pro_tips,
      };
    } catch (fallbackError) {
      console.error('[diseaseDetection] Groq Vision fallback also failed:', fallbackError);
    }
  }

  // Backend unavailable — return explicit error instead of random guess
  return {
    disease_name: 'Connection Error',
    confidence: 0,
    severity_level: 'Warning',
    symptoms: 'Unable to connect to the AI analysis service.',
    causes: 'The backend server may be offline or your internet connection is unstable.',
    prevention: 'Ensure you have a stable internet connection.',
    treatment: 'Please try scanning again when you have a stable connection.',
    organic_treatment: '',
    pesticide_recommendations: '',
    irrigation_recommendations: '',
    fertilizer_recommendations: '',
    recovery_steps: '1. Check your internet connection\n2. Restart the app\n3. Try scanning again',
    estimated_recovery_time: '',
    weather_risk: '',
    prevention_tips: '',
    is_valid_crop: undefined,
    quality_issue: 'Unable to reach the analysis server. Please check your connection and try again.',
  };
}

export function getDiseaseColor(diseaseName: string): string {
  if (diseaseName.toLowerCase().includes('healthy')) return '#10B981';
  if (diseaseName.toLowerCase().includes('early blight')) return '#EF4444';
  if (diseaseName.toLowerCase().includes('late blight')) return '#DC2626';
  if (diseaseName.toLowerCase().includes('powdery')) return '#F59E0B';
  if (diseaseName.toLowerCase().includes('bacterial')) return '#8B5CF6';
  return '#EF4444';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'High Confidence';
  if (confidence >= 75) return 'Moderate Confidence';
  return 'Low Confidence';
}

export function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'healthy': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'critical': return '#EF4444';
    default: return '#F59E0B';
  }
}

export function getSeverityEmoji(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '🟡';
  }
}
