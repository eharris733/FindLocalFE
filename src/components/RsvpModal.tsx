// src/components/RsvpModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import {
  getInvitationByToken,
  submitRsvp,
  updateRsvp,
  InvitationDetails,
  EventRsvp,
} from '../api/invitations';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { logger } from '../utils/logger';

interface RsvpModalProps {
  visible: boolean;
  onClose: () => void;
  inviteToken: string;
  eventId: string;
  eventTitle?: string;
  onRsvpSuccess?: (response: 'yes' | 'no' | 'maybe') => void;
  existingRsvp?: EventRsvp | null;
}

type RsvpStep = 'loading' | 'passcode' | 'respond' | 'success' | 'error';

export function RsvpModal({
  visible,
  onClose,
  inviteToken,
  eventId,
  eventTitle,
  onRsvpSuccess,
  existingRsvp,
}: RsvpModalProps) {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<RsvpStep>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [passcode, setPasscode] = useState('');
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<'yes' | 'no' | 'maybe' | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (existingRsvp) {
        // Editing mode - pre-fill form and skip to respond step
        setSelectedResponse(existingRsvp.response);
        setPlusOneCount(existingRsvp.plus_one_count);
        setStep('respond');
      } else if (inviteToken) {
        // New RSVP mode - load invitation
        loadInvitation();
      }
    }
  }, [visible, inviteToken, existingRsvp]);
  
  const loadInvitation = async () => {
    setStep('loading');
    setError(null);
    
    try {
      const { data, error: fetchError } = await getInvitationByToken(inviteToken);
      
      if (fetchError || !data) {
        setError(fetchError?.message || 'Invitation not found or expired');
        setStep('error');
        return;
      }
      
      if (!data.is_valid) {
        setError('This invitation is no longer valid');
        setStep('error');
        return;
      }
      
      setInvitation(data);
      
      // If passcode required, show passcode step
      if (data.passcode_required) {
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
    if (!isLoggedIn) {
      setError('You must be signed in to RSVP. Please create an account or sign in.');
      return;
    }

    setSelectedResponse(response);
    await submitResponse(response);
  };
  
  const submitResponse = async (response: 'yes' | 'no' | 'maybe') => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (existingRsvp) {
        // Update existing RSVP
        const result = await updateRsvp(
          existingRsvp.id,
          response,
          invitation?.allow_plus_one ? plusOneCount : 0
        );

        if (!result.success) {
          setError(result.error || 'Failed to update RSVP');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Create new RSVP
        const result = await submitRsvp({
          token: inviteToken,
          response,
          passcode: passcode || undefined,
          plusOneCount: invitation?.allow_plus_one ? plusOneCount : 0,
        });

        if (!result.success) {
          setError(result.error || 'Failed to submit RSVP');
          setIsSubmitting(false);
          return;
        }
      }

      setStep('success');
      onRsvpSuccess?.(response);
    } catch (err: any) {
      logger.error('Error submitting RSVP:', err);
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setStep('loading');
    setInvitation(null);
    setError(null);
    setPasscode('');
    setPlusOneCount(0);
    setSelectedResponse(null);
    onClose();
  };
  
  const responseColors = {
    yes: { bg: theme.colors.success, text: '#fff' },
    maybe: { bg: theme.colors.warning, text: '#fff' },
    no: { bg: theme.colors.error, text: '#fff' },
  };
  
  const renderLoadingStep = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="body1" style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        Loading invitation...
      </Text>
    </View>
  );
  
  const renderErrorStep = () => (
    <View style={styles.centeredContent}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
      <Text variant="h4" style={[styles.title, { color: theme.colors.text.primary }]}>
        Oops!
      </Text>
      <Text variant="body1" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary[500], marginTop: 24 }]}
        onPress={handleClose}
      >
        <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderPasscodeStep = () => (
    <>
      <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🔒</Text>
      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        Enter Passcode
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
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
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border.light }]}
          onPress={handleClose}
        >
          <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handlePasscodeSubmit}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
  
  const renderRespondStep = () => (
    <>
      {invitation?.message && (
        <View style={[styles.messageBox, { backgroundColor: theme.colors.primary[100] }]}>
          <Text variant="body2" style={{ color: theme.colors.primary[700], fontStyle: 'italic' }}>
            "{invitation.message}"
          </Text>
          {invitation.inviter_name && (
            <Text variant="caption" style={{ color: theme.colors.primary[600], marginTop: 8 }}>
              — {invitation.inviter_name}
            </Text>
          )}
        </View>
      )}

      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        {eventTitle ? `RSVP to ${eventTitle}` : 'RSVP to Event'}
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Let the host know if you're coming
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text variant="body2" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      )}

      {/* Sign-in prompt for unauthenticated users */}
      {!isLoggedIn && (
        <View style={[styles.authPrompt, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.light }]}>
          <Text variant="body2" style={{ color: theme.colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
            You need an account to RSVP
          </Text>
          <View style={styles.authButtonRow}>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: theme.colors.primary[500] }]}
              onPress={() => { handleClose(); router.push('/user/signup'); }}
            >
              <Text variant="body2" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, { borderColor: theme.colors.primary[500], borderWidth: 1 }]}
              onPress={() => { handleClose(); router.push('/user/signin'); }}
            >
              <Text variant="body2" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Response Buttons */}
      <View style={styles.responseContainer}>
        {(['yes', 'maybe', 'no'] as const).map((response) => (
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
            <Text style={{ fontSize: 24, marginBottom: 4 }}>
              {response === 'yes' ? '✓' : response === 'maybe' ? '?' : '✗'}
            </Text>
            <Text variant="body1" style={{
              color: selectedResponse === response
                ? responseColors[response].text
                : theme.colors.text.primary,
              fontWeight: '600',
              textTransform: 'capitalize',
            }}>
              {response === 'yes' ? 'Going' : response === 'maybe' ? 'Maybe' : 'Not Going'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plus One Input */}
      {invitation?.allow_plus_one && selectedResponse === 'yes' && (
        <View style={styles.plusOneContainer}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Bringing guests?
          </Text>
          <View style={styles.plusOneControls}>
            <TouchableOpacity
              style={[styles.plusOneButton, { borderColor: theme.colors.border.light }]}
              onPress={() => setPlusOneCount(Math.max(0, plusOneCount - 1))}
            >
              <Text variant="h4" style={{ color: theme.colors.text.primary }}>-</Text>
            </TouchableOpacity>
            <Text variant="h4" style={[styles.plusOneCount, { color: theme.colors.text.primary }]}>
              {plusOneCount}
            </Text>
            <TouchableOpacity
              style={[styles.plusOneButton, { borderColor: theme.colors.border.light }]}
              onPress={() => setPlusOneCount(plusOneCount + 1)}
            >
              <Text variant="h4" style={{ color: theme.colors.text.primary }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.cancelTextButton}
        onPress={handleClose}
      >
        <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </>
  );
  
  const renderSuccessStep = () => {
    const responseText = {
      yes: "You're going!",
      maybe: "You might be going",
      no: "You're not going",
    };
    
    const emoji = selectedResponse === 'yes' ? '🎉' : selectedResponse === 'maybe' ? '🤔' : '👋';
    
    return (
      <View style={styles.centeredContent}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</Text>
        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
          {selectedResponse ? responseText[selectedResponse] : 'RSVP Submitted'}
        </Text>
        <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          The host has been notified of your response
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary[500], marginTop: 24 }]}
          onPress={handleClose}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, {
          backgroundColor: theme.colors.background.primary,
          borderRadius: theme.borderRadius.lg,
          ...theme.shadows.large,
        }]}>
          {step === 'loading' && renderLoadingStep()}
          {step === 'error' && renderErrorStep()}
          {step === 'passcode' && renderPasscodeStep()}
          {step === 'respond' && renderRespondStep()}
          {step === 'success' && renderSuccessStep()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 24,
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  responseContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  responseButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
  },
  authPrompt: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  authButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  authButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  plusOneContainer: {
    marginBottom: 16,
  },
  plusOneControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  plusOneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOneCount: {
    minWidth: 40,
    textAlign: 'center',
  },
  cancelTextButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
