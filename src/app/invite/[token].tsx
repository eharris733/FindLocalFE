// src/app/invite/[token].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { logger } from '../../utils/logger';

type PageStep = 'loading' | 'passcode' | 'respond' | 'success' | 'error';

export default function InviteResponsePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();

  const [step, setStep] = useState<PageStep>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [passcode, setPasscode] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

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
    // If not logged in and anonymous RSVPs are not allowed, show error
    if (!isLoggedIn && !invitation?.allow_anonymous_rsvp) {
      setError('You must be signed in to RSVP');
      return;
    }

    // If not logged in and no anonymous name, prompt for name
    if (!isLoggedIn && !anonymousName.trim()) {
      setSelectedResponse(response);
      return; // Form will show name input
    }

    setSelectedResponse(response);
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
        anonymousName: !isLoggedIn ? anonymousName.trim() : undefined,
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

  const renderRespond = () => {
    const showNameInput = !isLoggedIn && selectedResponse !== null;

    return (
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

        {/* Anonymous Name Input */}
        {showNameInput && (
          <View style={styles.inputSection}>
            <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
              Your Name
            </Text>
            <TextInput
              style={[styles.textInput, {
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.light,
              }]}
              value={anonymousName}
              onChangeText={setAnonymousName}
              placeholder="Enter your name..."
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>
        )}

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

        {/* Submit Button (only shows if we need name input) */}
        {showNameInput && (
          <TouchableOpacity
            style={[styles.submitButton, {
              backgroundColor: anonymousName.trim()
                ? theme.colors.primary[500]
                : theme.colors.gray[300],
            }]}
            onPress={() => selectedResponse && submitResponse(selectedResponse)}
            disabled={!anonymousName.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
                Submit RSVP
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    flex: 1,
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
    marginBottom: 24,
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
});
