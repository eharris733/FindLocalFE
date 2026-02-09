import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type { Href } from 'expo-router';

// Complete the auth session when the component mounts
// This tells expo-web-browser that we're handling the redirect
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function AuthCallback() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.colors.background.primary,
    },
    errorContainer: {
      alignItems: 'center',
      maxWidth: 400,
    },
    errorTitle: {
      marginBottom: 16,
      textAlign: 'center',
    },
    errorMessage: {
      textAlign: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
  });

  // Helper function to sync user metadata to profile
  const syncUserMetadataToProfile = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const metadata = user.user_metadata || {};
      
      // Prepare update data - only include fields that exist in metadata
      const updateData: any = {};
      
      if (metadata.display_name) {
        updateData.display_name = metadata.display_name;
      }
      
      // Handle full_name from Apple Sign In or other OAuth providers
      if (metadata.full_name) {
        updateData.full_name = metadata.full_name;
      }
      
      if (metadata.agreed_to_terms !== undefined) {
        updateData.agreed_to_terms = metadata.agreed_to_terms;
      }
      
      // Check if marketing_opt_in exists in metadata (including false values)
      if ('marketing_opt_in' in metadata) {
        updateData.marketing_opt_in = metadata.marketing_opt_in;
      }

      // Only update if we have data to sync
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          logger.error('Error syncing metadata to profile:', updateError);
        } else {
          logger.info('Successfully synced metadata to profile');
        }
      }
    } catch (error) {
      logger.error('Error in syncUserMetadataToProfile:', error);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple simultaneous executions
      if (isProcessing || hasProcessed) {
        logger.debug('[AuthCallback] Already processing auth callback, skipping...');
        return;
      }

      logger.info('[AuthCallback] Starting auth callback handler');
      logger.info('[AuthCallback] Params received:', JSON.stringify(params));
      logger.info('[AuthCallback] Platform:', Platform.OS);

      setIsProcessing(true);
      setHasProcessed(true);

      try {
        // For web, extract type from URL directly before Supabase processes it
        let authType = params.type as string | undefined;

        // On web, also check the URL hash/search params directly
        if (typeof window !== 'undefined' && !authType) {
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          authType = urlParams.get('type') || hashParams.get('type') || undefined;
        }

        if (Platform.OS === 'web') {
          logger.info('[AuthCallback] URL search:', window.location.search);
          logger.info('[AuthCallback] URL hash:', window.location.hash);
          logger.info('[AuthCallback] Full window location:', window.location.href);
        }
        logger.info('[AuthCallback] authType from params:', params.type);
        logger.info('[AuthCallback] authType extracted:', authType);

        // Check for URL errors first
        const { 
          error: urlError, 
          error_description,
        } = params;

        logger.info('Auth callback initialized with params:', params);
        logger.info('Detected auth type:', authType);

        // Handle error cases from URL
        if (urlError) {
          const errorStr = String(urlError);
          
          if (errorStr === 'access_denied') {
            setError('Email verification link has expired or has already been used. Please request a new one.');
          } else if (errorStr.includes('expired')) {
            setError('This link has expired. Please request a new link.');
          } else {
            setError(error_description 
              ? String(error_description) 
              : 'Authentication failed. Please try again.'
            );
          }
          
          router.replace('/user/signin');
          return;
        }

        // detectSessionInUrl should have already handled the URL tokens
        // So we just need to check if a session exists
        logger.info('[AuthCallback] Checking for session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        logger.info('[AuthCallback] Session check result:', session ? 'Session found' : 'No session');

        if (sessionError) {
          logger.error('[AuthCallback] Session error:', sessionError);
          setError(sessionError.message);
          router.replace('/user/signin');
          return;
        }

        if (session) {
          logger.info('[AuthCallback] Session found for user:', session.user.email);
          
          // Check if this is a password recovery flow
          if (authType === 'recovery') {
            logger.info('Password recovery flow detected, redirecting to reset page...');
            // For password recovery, redirect to the reset password page
            router.replace('/user/reset');
            return;
          }
          
          // Sync user metadata to profile
          await syncUserMetadataToProfile(session.user.id);
          
          // Mark onboarding as completed for OAuth users
          // This prevents the onboarding modal from showing again
          await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');

          // Check for pending RSVP from invite flow
          const pendingRsvpData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_RSVP);
          if (pendingRsvpData) {
            try {
              const pendingRsvp = JSON.parse(pendingRsvpData);
              if (pendingRsvp.token) {
                logger.info('Pending RSVP found, redirecting to invite page...');
                router.replace(`/invite/${pendingRsvp.token}` as Href);
                return;
              }
            } catch (parseErr) {
              logger.warn('Error parsing pending RSVP data:', parseErr);
            }
          }

          logger.info('Redirecting to home...');

          // Success! Redirect to home
          router.replace('/');
        } else {
          logger.warn('No session found after callback');
          setError('Authentication failed. Please try again.');
          router.replace('/user/signin');
        }
      } catch (err: any) {
        logger.error('Auth callback error:', err);
        setError('An unexpected error occurred. Please try signing in again.');
        router.replace('/user/signin');
      } finally {
        setIsProcessing(false);
      }
    };

    // Only run when params are available AND we haven't processed yet
    if (!hasProcessed && (Object.keys(params).length > 0 || (globalThis.window !== undefined && (globalThis.window.location.search || globalThis.window.location.hash)))) {
      handleAuthCallback();
    } else if (!hasProcessed) {
      logger.debug('Waiting for params...');
    }
  }, [params, router, hasProcessed]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="h3" color="error" style={styles.errorTitle}>
            Authentication Error
          </Text>
          <Text variant="body1" color="secondary" style={styles.errorMessage}>
            {error}
          </Text>
          <Text variant="body2" color="secondary" style={[styles.errorMessage, { marginTop: 16 }]}>
            Redirecting to sign in...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text variant="body1" color="secondary" style={styles.loadingText}>
          Completing sign in...
        </Text>
      </View>
    </View>
  );
}
