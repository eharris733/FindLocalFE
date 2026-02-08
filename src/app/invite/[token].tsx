// src/app/invite/[token].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import {
  getInvitationByToken,
  submitRsvp,
  InvitationDetails,
} from '../../api/invitations';
import { getEventById } from '../../api/events';
import { Event } from '../../types/events';
import { supabase, getAuthRedirectUrl } from '../../supabase';
import { logger } from '../../utils/logger';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import GoogleSignInButton from '../../components/user/GoogleSignInButton';
import AppleSignInButton from '../../components/user/AppleSignInButton';

type PageStep = 'loading' | 'passcode' | 'respond' | 'auth' | 'success' | 'error';
type AuthMode = 'signup' | 'signin';

export default function InviteResponsePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const prevIsLoggedIn = useRef(isLoggedIn);

  const [step, setStep] = useState<PageStep>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [passcode, setPasscode] = useState('');
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline auth state
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
      checkPendingRsvp();
    }
  }, [token]);

  // Auto-submit RSVP when user becomes logged in (after inline auth or OAuth return)
  useEffect(() => {
    if (isLoggedIn && !prevIsLoggedIn.current && selectedResponse) {
      // User just logged in and has a pending response - auto-submit
      submitResponse(selectedResponse);
    }
    prevIsLoggedIn.current = isLoggedIn;
  }, [isLoggedIn]);

  const checkPendingRsvp = async () => {
    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_RSVP);
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        if (pending.token === token && isLoggedIn) {
          // User returned from OAuth with a pending RSVP - restore and submit
          setSelectedResponse(pending.response);
          setPlusOneCount(pending.plusOneCount || 0);
          await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_RSVP);
          // Wait for invitation to load before submitting
          // The submission will happen via the isLoggedIn useEffect or after invitation loads
        } else if (pending.token === token) {
          // Restore selected response but don't submit yet (not logged in)
          setSelectedResponse(pending.response);
          setPlusOneCount(pending.plusOneCount || 0);
        }
      }
    } catch (err) {
      logger.warn('Error checking pending RSVP:', err);
    }
  };

  const loadInvitation = async () => {
    setStep('loading');
    setError(null);

    try {
      const { data: inviteData, error: fetchError } = await getInvitationByToken(token || '');

      if (fetchError || !inviteData) {
        setError(fetchError?.message || 'Invitation not found or expired');
        setStep('error');
        return;
      }

      if (!inviteData.is_valid) {
        setError('This invitation is no longer valid');
        setStep('error');
        return;
      }

      setInvitation(inviteData);

      // Fetch event details
      try {
        const eventData = await getEventById(inviteData.event_id);
        setEvent(eventData);
      } catch (err) {
        logger.warn('Could not fetch event details:', err);
      }

      // If passcode required, show passcode step
      if (inviteData.passcode_required) {
        setStep('passcode');
      } else {
        setStep('respond');
      }

      // Check if user returned from OAuth with pending RSVP
      if (isLoggedIn) {
        const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_RSVP);
        if (pendingData) {
          const pending = JSON.parse(pendingData);
          if (pending.token === token) {
            await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_RSVP);
            setSelectedResponse(pending.response);
            setPlusOneCount(pending.plusOneCount || 0);
            // Submit after a short delay to let state settle
            setTimeout(() => {
              submitResponse(pending.response);
            }, 100);
          }
        }
      }
    } catch (err: any) {
      logger.error('Error loading invitation:', err);
      setError(err.message || 'Failed to load invitation');
      setStep('error');
    }
  };

  const handlePasscodeSubmit = () => {
    if (!passcode.trim()) {
      setError('Please enter the passcode');
      return;
    }
    setError(null);
    setStep('respond');
  };

  const handleResponseSelect = async (response: 'yes' | 'no' | 'maybe') => {
    setSelectedResponse(response);

    if (!isLoggedIn) {
      // User must create an account - show auth step
      setStep('auth');
      return;
    }

    // User is logged in - submit directly
    await submitResponse(response);
  };

  const submitResponse = async (response: 'yes' | 'no' | 'maybe') => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitRsvp({
        token: token || '',
        response,
        passcode: passcode || undefined,
        plusOneCount: invitation?.allow_plus_one ? plusOneCount : 0,
      });

      if (!result.success) {
        setError(result.error || 'Failed to submit RSVP');
        setIsSubmitting(false);
        return;
      }

      setStep('success');
    } catch (err: any) {
      logger.error('Error submitting RSVP:', err);
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePendingRsvp = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_RSVP,
        JSON.stringify({
          token,
          response: selectedResponse,
          plusOneCount,
        })
      );
    } catch (err) {
      logger.warn('Error saving pending RSVP:', err);
    }
  };

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter your email and password');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        const redirectTo = getAuthRedirectUrl('/auth/callback');
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          if (error.status === 422) {
            setAuthError(error.message || 'Please check your email and password.');
          } else if (error.status === 429) {
            setAuthError('Too many attempts. Please wait a moment and try again.');
          } else {
            setAuthError(error.message || 'Sign up failed. Please try again.');
          }
          return;
        }

        if (!data.session) {
          // Email confirmation required - save pending RSVP for when they verify
          await savePendingRsvp();
          setEmailSent(true);
          return;
        }

        // Session created immediately - auth state change will trigger auto-submit
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });

        if (error) {
          setAuthError(error.message || 'Sign in failed. Please try again.');
          return;
        }

        // Auth state change will trigger auto-submit via useEffect
      }
    } catch (err: any) {
      logger.error('Auth error:', err);
      setAuthError(err.message || 'An error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthStart = async () => {
    // Save pending RSVP before OAuth redirect takes user away
    await savePendingRsvp();
  };

  const handleViewEvent = () => {
    if (event) {
      router.replace(`/event/${event.id}`);
    }
  };

  const responseColors = {
    yes: { bg: theme.colors.success, text: '#fff' },
    maybe: { bg: theme.colors.warning, text: '#fff' },
    no: { bg: theme.colors.error, text: '#fff' },
  };

  const renderLoading = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="body1" style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        Loading invitation...
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centeredContent}>
      <Text style={{ fontSize: 64, marginBottom: 24 }}>😔</Text>
      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        Oops!
      </Text>
      <Text variant="body1" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary[500], marginTop: 32 }]}
        onPress={() => router.replace('/')}
      >
        <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
          Go Home
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasscode = () => (
    <View style={styles.formContent}>
      <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 24 }}>🔒</Text>
      <Text variant="h2" style={[styles.title, { color: theme.colors.text.primary }]}>
        Enter Passcode
      </Text>
      <Text variant="body1" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        This invitation requires a passcode to RSVP
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text variant="body2" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      )}

      <TextInput
        style={[styles.textInput, {
          backgroundColor: theme.colors.background.secondary,
          color: theme.colors.text.primary,
          borderColor: theme.colors.border.light,
        }]}
        value={passcode}
        onChangeText={setPasscode}
        placeholder="Enter passcode..."
        placeholderTextColor={theme.colors.text.tertiary}
        autoCapitalize="none"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary[500] }]}
        onPress={handlePasscodeSubmit}
      >
        <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRespond = () => (
    <View style={styles.formContent}>
      {/* Event Info */}
      {event && (
        <View style={[styles.eventCard, { backgroundColor: theme.colors.background.secondary }]}>
          {event.image_url && (
            <Image
              source={{ uri: event.image_url }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.eventInfo}>
            <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
              {event.title}
            </Text>
            {event.event_date && (
              <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
                📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            )}
            {event.start_time && (
              <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
                🕐 {event.start_time}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Invitation Message */}
      {invitation?.message && (
        <View style={[styles.messageBox, { backgroundColor: theme.colors.primary[100] }]}>
          <Text variant="body1" style={{ color: theme.colors.primary[700], fontStyle: 'italic' }}>
            "{invitation.message}"
          </Text>
          {invitation.inviter_name && (
            <Text variant="body2" style={{ color: theme.colors.primary[600], marginTop: 8 }}>
              — {invitation.inviter_name}
            </Text>
          )}
        </View>
      )}

      <Text variant="h3" style={[styles.responseTitle, { color: theme.colors.text.primary }]}>
        Are you going?
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text variant="body2" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      )}

      {/* Response Buttons */}
      <View style={styles.responseContainer}>
        {(['yes', 'maybe', 'no'] as const).map((response) => {
          const icon = response === 'yes' ? '✓' : response === 'maybe' ? '?' : '✗';
          const label = response === 'yes' ? 'Going' : response === 'maybe' ? 'Maybe' : 'Not Going';

          return (
            <TouchableOpacity
              key={response}
              style={[
                styles.responseButton,
                {
                  backgroundColor: selectedResponse === response
                    ? responseColors[response].bg
                    : theme.colors.background.secondary,
                  borderColor: selectedResponse === response
                    ? responseColors[response].bg
                    : theme.colors.border.light,
                },
              ]}
              onPress={() => handleResponseSelect(response)}
              disabled={isSubmitting}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{icon}</Text>
              <Text variant="body1" style={{
                color: selectedResponse === response
                  ? responseColors[response].text
                  : theme.colors.text.primary,
                fontWeight: '600',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Plus One Input */}
      {invitation?.allow_plus_one && selectedResponse === 'yes' && (
        <View style={styles.inputSection}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Bringing guests?
          </Text>
          <View style={styles.plusOneControls}>
            <TouchableOpacity
              style={[styles.plusOneButton, { borderColor: theme.colors.border.light }]}
              onPress={() => setPlusOneCount(Math.max(0, plusOneCount - 1))}
            >
              <Text variant="h3" style={{ color: theme.colors.text.primary }}>-</Text>
            </TouchableOpacity>
            <Text variant="h3" style={[styles.plusOneCount, { color: theme.colors.text.primary }]}>
              {plusOneCount}
            </Text>
            <TouchableOpacity
              style={[styles.plusOneButton, { borderColor: theme.colors.border.light }]}
              onPress={() => setPlusOneCount(plusOneCount + 1)}
            >
              <Text variant="h3" style={{ color: theme.colors.text.primary }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Submitting indicator */}
      {isSubmitting && (
        <View style={styles.submittingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text variant="body2" style={{ color: theme.colors.text.secondary, marginLeft: 8 }}>
            Submitting your RSVP...
          </Text>
        </View>
      )}
    </View>
  );

  const renderAuth = () => {
    if (emailSent) {
      return (
        <ScrollView contentContainerStyle={styles.formContent}>
          <View style={styles.centeredContent}>
            <Text style={{ fontSize: 64, marginBottom: 24 }}>📧</Text>
            <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
              Check Your Email
            </Text>
            <Text variant="body1" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              We sent a verification link to{' '}
              <Text style={{ fontWeight: '600', color: theme.colors.text.primary }}>{authEmail}</Text>.
              {'\n'}Verify your email to complete your RSVP.
            </Text>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.light }]}>
              <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
                Don't see it? Check your spam folder. The link will expire in 24 hours.
              </Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    const responseLabel = selectedResponse === 'yes' ? 'Going' : selectedResponse === 'maybe' ? 'Maybe' : 'Not Going';

    return (
      <ScrollView contentContainerStyle={styles.formContent}>
        {/* Selected response summary */}
        {selectedResponse && (
          <View style={[styles.responseSummary, { backgroundColor: responseColors[selectedResponse].bg + '15', borderColor: responseColors[selectedResponse].bg }]}>
            <Text variant="body1" style={{ color: responseColors[selectedResponse].bg, fontWeight: '600' }}>
              Your response: {responseLabel}
            </Text>
            <TouchableOpacity onPress={() => { setStep('respond'); setError(null); }}>
              <Text variant="body2" style={{ color: theme.colors.primary[500] }}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary, marginTop: 16 }]}>
          {authMode === 'signup' ? 'Create an Account to RSVP' : 'Sign In to RSVP'}
        </Text>
        <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          {authMode === 'signup'
            ? 'Create a free account to confirm your RSVP'
            : 'Sign in to your existing account'}
        </Text>

        {authError && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
            <Text variant="body2" style={{ color: theme.colors.error }}>
              {authError}
            </Text>
          </View>
        )}

        {/* Email input */}
        <View style={styles.inputSection}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Email
          </Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
            }]}
            value={authEmail}
            onChangeText={setAuthEmail}
            placeholder="email@address.com"
            placeholderTextColor={theme.colors.text.tertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        {/* Password input */}
        <View style={styles.inputSection}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Password
          </Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
            }]}
            value={authPassword}
            onChangeText={setAuthPassword}
            placeholder={authMode === 'signup' ? 'Create a password (min. 6 characters)' : 'Enter your password'}
            placeholderTextColor={theme.colors.text.tertiary}
            autoCapitalize="none"
            secureTextEntry
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, {
            backgroundColor: (authEmail.trim() && authPassword.trim())
              ? theme.colors.primary[500]
              : theme.colors.gray[300],
          }]}
          onPress={handleEmailAuth}
          disabled={!authEmail.trim() || !authPassword.trim() || authLoading}
        >
          {authLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
              {authMode === 'signup' ? 'Create Account & RSVP' : 'Sign In & RSVP'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.light }]} />
          <Text variant="body2" style={{ color: theme.colors.text.tertiary, marginHorizontal: 16 }}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.light }]} />
        </View>

        {/* OAuth buttons */}
        <View style={styles.oauthContainer}>
          <GoogleSignInButton
            onSuccess={() => {}}
            onError={(err) => setAuthError(err)}
            setLoading={(loading) => {
              setAuthLoading(loading);
              if (loading) handleOAuthStart();
            }}
          />
          <AppleSignInButton
            onSuccess={() => {}}
            onError={(err) => setAuthError(err)}
            setLoading={(loading) => {
              setAuthLoading(loading);
              if (loading) handleOAuthStart();
            }}
          />
        </View>

        {/* Toggle auth mode */}
        <View style={styles.authToggle}>
          <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
            {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          </Text>
          <TouchableOpacity onPress={() => {
            setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
            setAuthError(null);
          }}>
            <Text variant="body2" style={{ color: theme.colors.primary[500], fontWeight: '600', marginLeft: 8 }}>
              {authMode === 'signup' ? 'Sign In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderSuccess = () => {
    const responseText = {
      yes: "You're going!",
      maybe: "You might be going",
      no: "You're not going",
    };

    let emoji = '🎉';
    if (selectedResponse === 'maybe') emoji = '🤔';
    if (selectedResponse === 'no') emoji = '👋';

    return (
      <View style={styles.centeredContent}>
        <Text style={{ fontSize: 80, marginBottom: 24 }}>{emoji}</Text>
        <Text variant="h2" style={[styles.title, { color: theme.colors.text.primary }]}>
          {selectedResponse ? responseText[selectedResponse] : 'RSVP Submitted'}
        </Text>
        <Text variant="body1" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          The host has been notified of your response
        </Text>

        {event && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary[500], marginTop: 32 }]}
            onPress={handleViewEvent}
          >
            <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
              View Event Details
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.textButton, { marginTop: 16 }]}
          onPress={() => router.replace('/')}
        >
          <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
            Go to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {step === 'loading' && renderLoading()}
      {step === 'error' && renderError()}
      {step === 'passcode' && renderPasscode()}
      {step === 'respond' && renderRespond()}
      {step === 'auth' && renderAuth()}
      {step === 'success' && renderSuccess()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  formContent: {
    flexGrow: 1,
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
  },
  errorBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  messageBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  eventInfo: {
    padding: 16,
  },
  responseTitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  responseContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  responseButton: {
    flex: 1,
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 18,
  },
  plusOneControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  plusOneButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOneCount: {
    minWidth: 48,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 12,
  },
  textButton: {
    padding: 12,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  responseSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  oauthContainer: {
    gap: 12,
    marginBottom: 16,
  },
  authToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
});
