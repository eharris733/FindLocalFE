import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabasePublishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable');
}

// Use AsyncStorage adapter for RN; on web, Supabase will fall back to localStorage
const ExpoWebSecureStoreAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: ExpoWebSecureStoreAdapter } : {}),
    autoRefreshToken: true,
    flowType: Platform.OS === 'web' ? 'implicit' : 'pkce', // Use implicit flow for web to support cross-device password reset
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Only detect on web, mobile uses deep links
  },
  db: { schema: 'public' },
});

// Add debug logging for auth state changes on web (for debugging PKCE flow)
if (Platform.OS === 'web') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, session ? `User: ${session.user.email}` : 'No session');
    if (event === 'PASSWORD_RECOVERY') {
      console.log('[Supabase Auth] Password recovery event detected');
    }
  });
}

// Helper function to get the correct redirect URL for auth flows
export const getAuthRedirectUrl = (path: string = '/auth/callback') => {
  if (Platform.OS === 'web') {
    const url = `${globalThis.window.location.origin}${path}`;
    console.log('[getAuthRedirectUrl] Web URL:', url);
    return url;
  }

  // For mobile, use expo-auth-session's makeRedirectUri
  // This automatically handles development (exp://10.0.0.129:8081) vs production (findlocal://)
  const url = makeRedirectUri({
    scheme: 'findlocal',
    path: path.startsWith('/') ? path.substring(1) : path,
    preferLocalhost: true, // Use localhost in development
    isTripleSlashed: false, // Use double slash format
  });

  console.log('[getAuthRedirectUrl] Mobile URL:', url);
  console.log('[getAuthRedirectUrl] Path:', path);
  console.log('[getAuthRedirectUrl] Platform:', Platform.OS);
  console.log('[getAuthRedirectUrl] __DEV__:', __DEV__);
  console.log('[getAuthRedirectUrl] Constants.expoConfig?.scheme:', Constants.expoConfig?.scheme);

  return url;
};

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
