// src/components/InviteModal.tsx
import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import { createEventInvitation, getInviteUrl } from '../api/invitations';
import { logger } from '../utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

type InviteStep = 'options' | 'loading' | 'share';

export function InviteModal({ visible, onClose, eventId, eventTitle }: InviteModalProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Options state
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [allowPlusOne, setAllowPlusOne] = useState(false);
  const [usePasscode, setUsePasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  
  // UI state
  const [step, setStep] = useState<InviteStep>('options');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const resetState = () => {
    setStep('options');
    setAllowAnonymous(true);
    setAllowPlusOne(false);
    setUsePasscode(false);
    setPasscode('');
    setMessage('');
    setInviteToken(null);
    setError(null);
  };
  
  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleCreateInvite = async () => {
    setStep('loading');
    setError(null);
    
    try {
      const { data, error: createError } = await createEventInvitation({
        eventId,
        allowAnonymous,
        allowPlusOne,
        passcode: usePasscode && passcode.trim() ? passcode.trim() : undefined,
        message: message.trim() || undefined,
      });
      
      if (createError || !data) {
        setError(createError?.message || 'Failed to create invite');
        setStep('options');
        return;
      }

      // Invalidate queries so the Manage button appears and home page updates
      queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['myInvitationsWithStats'] });
      queryClient.invalidateQueries({ queryKey: ['myInvitations'] });

      setInviteToken(data.token);
      setStep('share');
    } catch (err: any) {
      logger.error('Error creating invite:', err);
      setError(err.message || 'Failed to create invite');
      setStep('options');
    }
  };
  
  const inviteUrl = inviteToken ? getInviteUrl(inviteToken) : '';
  
  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(inviteUrl);
        // Show feedback
        Alert.alert('Copied!', 'Link copied to clipboard');
      } else {
        // For native without expo-clipboard, show alert with the URL
        Alert.alert('Share Link', inviteUrl);
      }
    } catch (err) {
      logger.error('Error copying link:', err);
    }
  };
  
  const handleShareLink = async () => {
    try {
      const shareMessage = message 
        ? `${message}\n\nJoin me at ${eventTitle}: ${inviteUrl}`
        : `Check out ${eventTitle}! RSVP here: ${inviteUrl}`;
      
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: `Invitation: ${eventTitle}`,
          text: shareMessage,
          url: inviteUrl,
        });
      } else if (Platform.OS !== 'web') {
        await Share.share({
          message: shareMessage,
          url: inviteUrl,
          title: `Invitation: ${eventTitle}`,
        });
      } else {
        // Fallback for web without Web Share API
        handleCopyLink();
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled') {
        logger.error('Error sharing:', err);
      }
    }
  };
  
  const renderOptionsStep = () => (
    <>
      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        Create Invite Link
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Customize how people can respond to your invite
      </Text>
      
      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text variant="body2" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Options */}
      <View style={styles.optionsContainer}>
        {/* Allow Anonymous RSVPs */}
        <View style={[styles.optionRow, { borderBottomColor: theme.colors.border.light }]}>
          <View style={styles.optionTextContainer}>
            <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
              Allow Anonymous RSVPs
            </Text>
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              People can respond without signing in
            </Text>
          </View>
          <Switch
            value={allowAnonymous}
            onValueChange={setAllowAnonymous}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={allowAnonymous ? theme.colors.primary[600] : theme.colors.gray[100]}
          />
        </View>
        
        {/* Allow Plus One */}
        <View style={[styles.optionRow, { borderBottomColor: theme.colors.border.light }]}>
          <View style={styles.optionTextContainer}>
            <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
              Allow Plus Ones
            </Text>
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              People can bring guests
            </Text>
          </View>
          <Switch
            value={allowPlusOne}
            onValueChange={setAllowPlusOne}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={allowPlusOne ? theme.colors.primary[600] : theme.colors.gray[100]}
          />
        </View>
        
        {/* Passcode Protection */}
        <View style={[styles.optionRow, { borderBottomColor: theme.colors.border.light }]}>
          <View style={styles.optionTextContainer}>
            <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
              Require Passcode
            </Text>
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              Only people with the code can RSVP
            </Text>
          </View>
          <Switch
            value={usePasscode}
            onValueChange={setUsePasscode}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={usePasscode ? theme.colors.primary[600] : theme.colors.gray[100]}
          />
        </View>
        
        {/* Passcode Input */}
        {usePasscode && (
          <View style={styles.inputContainer}>
            <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
              Passcode
            </Text>
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
            />
          </View>
        )}
        
        {/* Message */}
        <View style={styles.inputContainer}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Personal Message (optional)
          </Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
            }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Add a message to your invite..."
            placeholderTextColor={theme.colors.text.tertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>
      
      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border.light }]}
          onPress={handleClose}
        >
          <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handleCreateInvite}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            Create Invite
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
  
  const renderLoadingStep = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="body1" style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        Creating your invite link...
      </Text>
    </View>
  );
  
  const renderShareStep = () => (
    <>
      <View style={styles.successIcon}>
        <Text style={{ fontSize: 48 }}>🎉</Text>
      </View>
      
      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        Invite Created!
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Share this link to invite people
      </Text>
      
      {/* Invite URL Box */}
      <View style={[styles.urlBox, {
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.light,
      }]}>
        <Text 
          variant="body2" 
          style={{ color: theme.colors.text.primary }}
          numberOfLines={2}
          selectable
        >
          {inviteUrl}
        </Text>
      </View>
      
      {/* Settings Summary */}
      <View style={[styles.settingsSummary, { backgroundColor: theme.colors.background.secondary }]}>
        <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
          {allowAnonymous ? '✓ Anonymous RSVPs allowed' : '✗ Sign-in required'}
          {' • '}
          {allowPlusOne ? '✓ Plus ones allowed' : '✗ No plus ones'}
          {usePasscode && passcode ? ` • 🔒 Passcode: ${passcode}` : ''}
        </Text>
      </View>
      
      {/* Share Actions */}
      <View style={styles.shareActionsContainer}>
        <TouchableOpacity
          style={[styles.copyButton, {
            borderColor: theme.colors.primary[500],
          }]}
          onPress={handleCopyLink}
        >
          <Text variant="body1" style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
            📋 Copy Link
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handleShareLink}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            📤 Share
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleClose}
      >
        <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
          Done
        </Text>
      </TouchableOpacity>
    </>
  );
  
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
          {step === 'options' && renderOptionsStep()}
          {step === 'loading' && renderLoadingStep()}
          {step === 'share' && renderShareStep()}
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
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  inputContainer: {
    marginTop: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  urlBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingsSummary: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  shareActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  copyButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
