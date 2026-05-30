/**
 * Firebase Configuration & Initialization
 * 
 * Centralised Firebase setup with AsyncStorage persistence for React Native.
 * All credentials are pulled from environment variables with safe fallbacks.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase Config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'mock-api-key-placeholder',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'agrinex-auth.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'agrinex-auth',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'agrinex-auth.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1098485292415',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1098485292415:android:1234567890abcdef',
};

// ─── Initialize Firebase App (singleton) ───────────────────────────────────────
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Initialize Firebase Auth with AsyncStorage persistence ────────────────────
let auth: Auth;
try {
  // Use React Native specific persistence via AsyncStorage
  const { getReactNativePersistence } = require('firebase/auth/react-native');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Fallback: use default auth (works in Expo Go / web environments)
  auth = getAuth(app);
}

// ─── Firebase Google Auth Credential Helper ────────────────────────────────────
/**
 * Exchange a Google OAuth ID token for a Firebase UserCredential.
 * Returns the Firebase user and credential on success.
 */
export async function signInWithGoogleIdToken(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export { app, auth, firebaseConfig };
export default auth;
