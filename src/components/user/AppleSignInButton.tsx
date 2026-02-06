import React from 'react';
import { Platform} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { supabase, getAuthRedirectUrl } from '../../supabase';
import { Button } from '../ui';
import { logger } from '../../utils/logger';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  setLoading?: (loading: boolean) => void;
}

export default function AppleSignInButton({ 
  onSuccess, 
  onError,
  setLoading 
}: AppleSignInButtonProps) {
  const [isAvailable, setIsAvailable] = React.useState(false);

  React.useEffect(() => {
    // Check if Apple Authentication is available (iOS 13+ only)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAvailable);
    }
  }, []);

  const handleAppleSignIn = async () => {
    try {
      setLoading?.(true);

      if (Platform.OS === 'ios' && isAvailable) {
        // Native iOS Sign In with Apple
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        logger.info('Apple credential received');

        // Sign in to Supabase with the Apple ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken!,
        });

        if (error) {
          logger.error('Supabase Apple sign in error:', error);
          onError?.(error.message || 'Failed to sign in with Apple');
          return;
        }

        // If user provided their name, update profile
        if (credential.fullName?.givenName || credential.fullName?.familyName) {
          const fullName = [
            credential.fullName.givenName,
            credential.fullName.familyName,
          ]
            .filter(Boolean)
            .join(' ');

          if (fullName && data.user) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName })
              .eq('id', data.user.id);
          }
        }

        onSuccess?.();
      } else {
        // Web OAuth flow
        await signInWithAppleWeb();
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        logger.info('Apple sign in canceled by user');
      } else {
        logger.error('Apple sign in error:', error);
        onError?.(error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading?.(false);
    }
  };

  async function signInWithAppleWeb() {
    try {
      const redirectTo = Platform.OS === 'web'
        ? `${globalThis.window.location.origin}/auth/callback`
        : getAuthRedirectUrl('/auth/callback');
      logger.info('[AppleSignIn] Generated redirect URL:', redirectTo);
      logger.info('[AppleSignIn] Platform:', Platform.OS);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
          scopes: 'name email'
        },
      });

      if (data?.url) {
        logger.info('[AppleSignIn] OAuth URL from Supabase:', data.url);
      }

      if (error) {
        if (error.status === 422) {
          onError?.('Unable to sign in with Apple. Please try again.');
        } else if (error.status === 429) {
          onError?.('Too many requests. Please wait a moment and try again.');
        } else {
          onError?.(`Apple sign-in failed: ${error.message || 'Please try again.'}`);
        }
        return;
      }

      if (data?.url && Platform.OS !== 'web') {
        // Open in-app browser for mobile OAuth
        // This will open the OAuth flow in an in-app browser
        // When OAuth completes, Supabase redirects to findlocal://auth/callback
        // which triggers a deep link back to the app and dismisses the browser
        const result = await WebBrowser.openBrowserAsync(data.url);

        // The browser was dismissed
        if (result.type === 'cancel') {
          logger.info('Apple sign-in canceled by user');
        }
        // Note: We don't call onSuccess/onError here because the deep link
        // will be handled by the /auth/callback route
      }
    } catch (err: any) {
      logger.error('Unexpected Apple sign-in error:', err);
      onError?.('An unexpected error occurred. Please try again.');
    }
  }

  // For iOS native, use the native Apple button
  if (Platform.OS === 'ios' && isAvailable) {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={{ width: '100%', height: 44 }}
        onPress={handleAppleSignIn}
      />
    );
  }

  // For web or Android, use custom button (only show on web)
  if (Platform.OS === 'web') {
    return (
      <Button
        title="Continue with Apple"
        variant="outline"
        onPress={handleAppleSignIn}
        fullWidth
      />
    );
  }

  // Don't render anything on Android (Apple Sign In not supported)
  return null;
}
