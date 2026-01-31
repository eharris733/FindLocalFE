import React from 'react';
import { Platform } from 'react-native';
import { Button } from '../ui';
import { supabase, getAuthRedirectUrl } from '../../supabase';
import * as WebBrowser from 'expo-web-browser';
import { logger } from '../../utils/logger';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  setLoading?: (loading: boolean) => void;
}

export default function GoogleSignInButton({ 
  onSuccess, 
  onError, 
  setLoading 
}: Readonly<GoogleSignInButtonProps>) {
  
  async function signInWithGoogle() {
    setLoading?.(true);
    try {
      const redirectTo = getAuthRedirectUrl('/auth/callback');
      logger.info('[GoogleSignIn] Generated redirect URL:', redirectTo);
      logger.info('[GoogleSignIn] Platform:', Platform.OS);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account', // Force Google to show account selection
          },
        },
      });

      if (data?.url) {
        logger.info('[GoogleSignIn] OAuth URL from Supabase:', data.url);
      }

      if (error) {
        // Handle OAuth sign-in errors
        let errorMessage: string;
        if (error.status === 422) {
          errorMessage = 'Unable to sign in with Google. The account may already exist. Try signing in instead.';
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else {
          errorMessage = `Google sign-in failed: ${error.message || 'Please try again.'}`;
        }

        onError?.(errorMessage);
      }

      if (data?.url && Platform.OS !== 'web') {
        // Open in-app browser for mobile OAuth
        // This will open the OAuth flow in an in-app browser
        // When OAuth completes, Supabase redirects to findlocal://auth/callback
        // which triggers a deep link back to the app and dismisses the browser
        logger.info('[GoogleSignIn] Opening browser with URL:', data.url);
        const result = await WebBrowser.openBrowserAsync(data.url);

        logger.info('[GoogleSignIn] Browser result:', JSON.stringify(result));

        // The browser was dismissed
        if (result.type === 'cancel') {
          logger.info('[GoogleSignIn] User canceled sign-in');
        } else if (result.type === 'dismiss') {
          logger.info('[GoogleSignIn] Browser was dismissed (likely via deep link)');
        }
        // Note: We don't call onSuccess here because the deep link
        // will be handled by the /auth/callback route
      } else if (data?.url && Platform.OS === 'web') {
        // On web, OAuth will redirect automatically
        onSuccess?.();
      }
    } catch (err: any) {
      logger.error('Unexpected Google sign-in error:', err);
      onError?.('An unexpected error occurred. Please try again.');
    } finally {
      setLoading?.(false);
    }
  }

  return (
    <Button 
      title="Continue with Google" 
      variant="outline" 
      onPress={signInWithGoogle}
      fullWidth
    />
  );
}
