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

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent multiple simultaneous executions
      if (isProcessing || hasProcessed) {
        console.log('Already processing auth callback, skipping...');
        return;
      }
      
      setIsProcessing(true);
      setHasProcessed(true);
      
      try {
        // Log all params for debugging
        console.log('=== AUTH CALLBACK DEBUG ===');
        console.log('All URL params:', params);
        const fullUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
        console.log('Full URL:', fullUrl);
        console.log('URL search params:', typeof window !== 'undefined' ? window.location.search : 'N/A');
        console.log('URL hash:', typeof window !== 'undefined' ? window.location.hash : 'N/A');
        
        // Check if we have auth tokens or code in the URL
        const { 
          code,
          access_token, 
          refresh_token, 
          error: urlError, 
          error_description,
          type 
        } = params;

        // Also check if 'type=recovery' is in the URL string directly
        // (in case it's not parsed into params correctly)
        const urlHasRecovery = typeof window !== 'undefined' && 
          (window.location.href.includes('type=recovery') || 
           window.location.href.includes('type%3Drecovery') ||
           window.location.hash.includes('type=recovery'));

        console.log('Parsed auth params:', { 
          hasCode: !!code,
          hasAccessToken: !!access_token, 
          hasRefreshToken: !!refresh_token, 
          error: urlError,
          type,
          urlHasRecovery
        });

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
          
          // Redirect to sign in after showing error
          setTimeout(() => router.replace('/user/signin'), 4000);
          return;
        }

        // Determine if this is a password recovery flow
        const isPasswordRecovery = type === 'recovery' || urlHasRecovery;
        
        // Password Recovery Flow: The session is automatically established by Supabase
        // when the user clicks the reset link. We just need to verify the session exists.
        if (code && isPasswordRecovery && !access_token) {
          console.log('Password recovery link detected, checking session...');
          
          // Supabase automatically sets the session when user clicks password reset link
          // We just need to verify it exists
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error('Recovery session error:', sessionError);
            setError('Failed to verify reset link. The link may have expired. Please request a new one.');
            setTimeout(() => router.replace('/user/signin'), 3000);
            return;
          }

          console.log('Recovery session established for user:', session.user.email);
          setTimeout(() => router.replace('/user/reset'), 500);
          return;
        }

        // PKCE Flow: Exchange code for session (OAuth, social logins, email confirmation)
        if (code && !isPasswordRecovery && !access_token) {
          console.log('PKCE code detected, exchanging for session...');
          
          // Try to exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError('Authentication failed. Please try signing in again.');
            setTimeout(() => router.replace('/user/signin'), 3000);
            return;
          }

          if (data?.session) {
            console.log('Session established via PKCE for user:', data.session.user.email);
            
            // Regular sign-in/sign-up
            console.log('Regular auth flow, redirecting to home');
            setTimeout(() => router.replace('/'), 500);
            return;
          } else {
            setError('Could not establish session. Please try again.');
            setTimeout(() => router.replace('/user/signin'), 3000);
            return;
          }
        }

        // Special handling for password recovery without tokens (session-based)
        if (type === 'recovery' && !access_token && !code) {
          // Check if we have an existing session (some flows set the session automatically)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Recovery session found, redirecting to reset page');
            setTimeout(() => router.replace('/user/reset'), 500);
            return;
          }
        }

        // Handle token-based authentication (email confirmation, magic links)
        // This is the older flow, but we still support it
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
          
          // Check if this is a password recovery flow
          // Check both the type param and the URL itself
          if (type === 'recovery' || urlHasRecovery) {
            console.log('Password recovery detected, redirecting to reset page');
            setTimeout(() => router.replace('/user/reset'), 500);
            return;
          }
          
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
      } finally {
        setIsProcessing(false);
      }
    };

    // Only run when params are available AND we haven't processed yet
    if (!hasProcessed && (Object.keys(params).length > 0 || (typeof window !== 'undefined' && (window.location.search || window.location.hash)))) {
      handleAuthCallback();
    } else if (!hasProcessed) {
      console.log('Waiting for params...');
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
