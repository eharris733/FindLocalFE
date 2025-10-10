import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../supabase';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';

export default function AuthCallback() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have auth tokens in the URL
        const { 
          access_token, 
          refresh_token, 
          error: urlError, 
          error_description,
          type 
        } = params;

        console.log('Auth callback params:', { 
          hasAccessToken: !!access_token, 
          hasRefreshToken: !!refresh_token, 
          error: urlError,
          type 
        });

        // Handle error cases from URL
        if (urlError) {
          const errorStr = String(urlError);
          
          if (errorStr === 'access_denied') {
            setError('Email verification link has expired or has already been used. Please request a new one.');
          } else if (errorStr.includes('expired')) {
            setError('This link has expired. Please request a new verification email.');
          } else {
            setError(error_description 
              ? String(error_description) 
              : 'Authentication failed. Please try again.'
            );
          }
          
          // Redirect to sign in after showing error
          setTimeout(() => router.replace('/user/signin'), 4000);
          return;
        }

        // Handle token-based authentication (email confirmation, magic links)
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: String(access_token),
            refresh_token: String(refresh_token),
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Failed to establish session. Please try signing in again.');
            setTimeout(() => router.replace('/user/signin'), 3000);
            return;
          }

          // Verify the session was set correctly
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            setError('Could not verify your session. Please try signing in again.');
            setTimeout(() => router.replace('/user/signin'), 3000);
            return;
          }

          console.log('Session established successfully for user:', session.user.email);
          
          // Success! Redirect to home
          setTimeout(() => router.replace('/'), 500);
        } else {
          // No tokens found, check if we already have a session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Existing session found, redirecting to home');
            router.replace('/');
          } else {
            setError('No valid authentication information found. Please try signing in again.');
            setTimeout(() => router.replace('/user/signin'), 3000);
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred. Please try signing in again.');
        setTimeout(() => router.replace('/user/signin'), 3000);
      }
    };

    handleAuthCallback();
  }, [params, router]);

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
