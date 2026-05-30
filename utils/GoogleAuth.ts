/**
 * GoogleAuth — Production-ready Google Sign-In Hook for Expo
 *
 * Uses expo-auth-session with a DIRECT custom scheme redirect (no proxy).
 * This eliminates the 404 error caused by the deprecated auth.expo.io proxy.
 *
 * Flow:
 *  1. User taps "Continue with Google"
 *  2. Browser opens Google OAuth consent screen
 *  3. Google redirects back to agrinex://redirect with auth code
 *  4. We exchange for tokens, fetch user profile, sign into Firebase
 *  5. Sync session with AgriNex backend
 *  6. Navigate to HomeScreen
 */
import { useEffect, useState, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { signInWithGoogleIdToken } from './firebaseConfig';
import { useAuthStore } from '../store/useAuthStore';

// Complete any pending auth sessions on app launch
WebBrowser.maybeCompleteAuthSession();

// ─── Client IDs ────────────────────────────────────────────────────────────────
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
  '1098485292415-p2dcr4v4n907rm01h24omsq3p7c0p8l2.apps.googleusercontent.com';

const ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
  '1098485292415-p2dcr4v4n907rm01h24omsq3p7c0p8l2.apps.googleusercontent.com';

const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
  '1098485292415-p2dcr4v4n907rm01h24omsq3p7c0p8l2.apps.googleusercontent.com';

const EXPO_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO ||
  '1098485292415-p2dcr4v4n907rm01h24omsq3p7c0p8l2.apps.googleusercontent.com';

// ─── Redirect URI (the fix!) ──────────────────────────────────────────────────
// Using the app's custom scheme instead of the deprecated Expo proxy.
// This generates: agrinex://redirect
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'agrinex',
  path: 'redirect',
});

console.log('[GoogleAuth] Redirect URI:', redirectUri);

// ─── Error types ───────────────────────────────────────────────────────────────
export type GoogleAuthError =
  | 'cancelled'
  | 'network'
  | 'invalid_token'
  | 'firebase_error'
  | 'backend_error'
  | 'unknown';

export interface GoogleAuthState {
  loading: boolean;
  error: GoogleAuthError | null;
  errorMessage: string | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useGoogleAuthentication() {
  const { googleLogin } = useAuthStore();
  const [state, setState] = useState<GoogleAuthState>({
    loading: false,
    error: null,
    errorMessage: null,
  });

  // Configure the Google auth request with direct scheme redirect
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  // ─── Handle OAuth Response ─────────────────────────────────────────────────
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      // If code exchange is pending on native platforms, wait for response.authentication
      const hasTokens = response.authentication || response.params?.id_token || response.params?.access_token;
      if (hasTokens) {
        handleSuccess(response);
      } else {
        console.log('[GoogleAuth] Success received, but tokens are not ready yet (waiting for code exchange...)');
      }
    } else if (response.type === 'error') {
      console.error('[GoogleAuth] OAuth error:', response.error);
      setState({
        loading: false,
        error: 'unknown',
        errorMessage: response.error?.message || 'Authentication failed. Please try again.',
      });
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      console.log('[GoogleAuth] User cancelled/dismissed');
      setState({ loading: false, error: 'cancelled', errorMessage: null });
    }
  }, [response]);

  // ─── Success Handler ───────────────────────────────────────────────────────
  const handleSuccess = async (successResponse: any) => {
    setState({ loading: true, error: null, errorMessage: null });

    try {
      const { authentication } = successResponse;
      if (!authentication) {
        throw { type: 'invalid_token' as GoogleAuthError, message: 'No authentication data received' };
      }

      const idToken = authentication.idToken;
      const accessToken = authentication.accessToken;

      // Step 1: Try Firebase credential sign-in (if we have an idToken)
      let firebaseUser = null;
      if (idToken) {
        try {
          const firebaseResult = await signInWithGoogleIdToken(idToken);
          firebaseUser = firebaseResult.user;
          console.log('[GoogleAuth] Firebase sign-in successful:', firebaseUser.email);
        } catch (fbError: any) {
          console.warn('[GoogleAuth] Firebase sign-in failed (non-fatal):', fbError.message);
          // Continue — we can still authenticate via backend with the access token
        }
      }

      // Step 2: Fetch Google user profile
      let profile = {
        email: firebaseUser?.email || 'unknown@gmail.com',
        name: firebaseUser?.displayName || 'Google User',
        picture: firebaseUser?.photoURL || '',
      };

      if (accessToken) {
        try {
          const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const gProfile = await res.json();
          if (gProfile?.email) {
            profile = {
              email: gProfile.email,
              name: gProfile.name || profile.name,
              picture: gProfile.picture || profile.picture,
            };
          }
        } catch (profileError) {
          console.warn('[GoogleAuth] Profile fetch failed (non-fatal):', profileError);
        }
      }

      // Step 3: Sync with AgriNex backend
      const tokenForBackend = idToken || accessToken || '';
      try {
        const { safeApiCall } = require('./network');
        await safeApiCall(() => googleLogin(tokenForBackend, profile), 10000);
        console.log('[GoogleAuth] Backend sync successful');
      } catch (backendError: any) {
        console.error('[GoogleAuth] Backend sync failed:', backendError.message);
        throw { type: 'backend_error' as GoogleAuthError, message: 'Failed to sync with server' };
      }

      setState({ loading: false, error: null, errorMessage: null });
    } catch (err: any) {
      const errorType: GoogleAuthError = err?.type || 'unknown';
      const errorMessage = err?.message || 'Authentication failed. Please try again.';
      console.error('[GoogleAuth] Error:', errorType, errorMessage);
      setState({ loading: false, error: errorType, errorMessage });
    }
  };

  // ─── Trigger Login ─────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    if (state.loading) return;

    setState({ loading: true, error: null, errorMessage: null });

    try {
      const result = await promptAsync();
      // Response is handled by the useEffect above
      if (!result || result.type === 'dismiss' || result.type === 'cancel') {
        setState({ loading: false, error: 'cancelled', errorMessage: null });
      }
    } catch (err: any) {
      console.error('[GoogleAuth] promptAsync error:', err);
      if (err.message?.toLowerCase().includes('network')) {
        setState({ loading: false, error: 'network', errorMessage: 'No internet connection' });
      } else {
        setState({ loading: false, error: 'unknown', errorMessage: 'Failed to open Google sign-in' });
      }
    }
  }, [promptAsync, state.loading]);

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const resetError = useCallback(() => {
    setState({ loading: false, error: null, errorMessage: null });
  }, []);

  return {
    loginWithGoogle,
    resetError,
    isReady: !!request,
    ...state,
  };
}
