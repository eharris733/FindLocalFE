import React from 'react';
import { Platform } from 'react-native';
import { Button } from '../ui';
import { supabase, getAuthRedirectUrl } from '../../supabase';
import * as Linking from 'expo-linking';
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

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
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
        } else {
          logger.warn('Cannot open URL from Supabase OAuth', data.url);
          onError?.('Unable to open sign-in page. Please try again.');
        }
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
