// src/components/InviteModal.tsx
import React, { useState, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../context/FriendsContext';
import { Text } from './ui';
import { UserAvatar } from './UserAvatar';
import { FriendPickerList } from './FriendPickerList';
import { useAlreadyInvitedQuery } from '../hooks/queries/useAlreadyInvitedQuery';
import {
  createEventInvitation,
  getInviteUrl,
  sendDirectEventInvites,
} from '../api/invitations';
import { logger } from '../utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

type InviteStep =
  | 'choose-mode'
  | 'friend-picker'
  | 'message'
  | 'sending'
  | 'success'
  | 'link-options'
  | 'link-loading'
  | 'link-share';

export function InviteModal({ visible, onClose, eventId, eventTitle }: InviteModalProps) {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const { friends } = useFriends();
  const queryClient = useQueryClient();

  // Shared state
  const [step, setStep] = useState<InviteStep>('choose-mode');
  const [error, setError] = useState<string | null>(null);

  // Friend invite state
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendMessage, setFriendMessage] = useState('');
  const [friendAllowPlusOne, setFriendAllowPlusOne] = useState(false);

  // Link invite state
  const [allowPlusOne, setAllowPlusOne] = useState(false);
  const [usePasscode, setUsePasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // Already invited query
  const { data: alreadyInvitedIds } = useAlreadyInvitedQuery(eventId);

  const resetState = () => {
    setStep('choose-mode');
    setError(null);
    setSelectedFriendIds(new Set());
    setFriendSearchQuery('');
    setFriendMessage('');
    setFriendAllowPlusOne(false);
    setAllowPlusOne(false);
    setUsePasscode(false);
    setPasscode('');
    setLinkMessage('');
    setInviteToken(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleFriendSelection = useCallback((friendId: string) => {
    setSelectedFriendIds(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }, []);

  // ============================================
  // Friend invite handlers
  // ============================================

  const handleSendDirectInvites = async () => {
    setStep('sending');
    setError(null);

    try {
      const { error: sendError } = await sendDirectEventInvites({
        eventId,
        recipientIds: [...selectedFriendIds],
        message: friendMessage.trim() || undefined,
        allowPlusOne: friendAllowPlusOne,
      });

      if (sendError) {
        setError(sendError.message || 'Failed to send invites');
        setStep('message');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['alreadyInvitedFriends', eventId] });
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });

      setStep('success');
    } catch (err: any) {
      logger.error('Error sending direct invites:', err);
      setError(err.message || 'Failed to send invites');
      setStep('message');
    }
  };

  // ============================================
  // Link invite handlers
  // ============================================

  const handleCreateInvite = async () => {
    setStep('link-loading');
    setError(null);

    try {
      const { data, error: createError } = await createEventInvitation({
        eventId,
        allowPlusOne,
        passcode: usePasscode && passcode.trim() ? passcode.trim() : undefined,
        message: linkMessage.trim() || undefined,
      });

      if (createError || !data) {
        setError(createError?.message || 'Failed to create invite');
        setStep('link-options');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['myInvitationsWithStats'] });
      queryClient.invalidateQueries({ queryKey: ['myInvitations'] });

      setInviteToken(data.token);
      setStep('link-share');
    } catch (err: any) {
      logger.error('Error creating invite:', err);
      setError(err.message || 'Failed to create invite');
      setStep('link-options');
    }
  };

  const inviteUrl = inviteToken ? getInviteUrl(inviteToken) : '';

  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(inviteUrl);
        Alert.alert('Copied!', 'Link copied to clipboard');
      } else {
        Alert.alert('Share Link', inviteUrl);
      }
    } catch (err) {
      logger.error('Error copying link:', err);
    }
  };

  const handleShareLink = async () => {
    try {
      const shareMessage = linkMessage
        ? `${linkMessage}\n\nJoin me at ${eventTitle}: ${inviteUrl}`
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
        handleCopyLink();
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled') {
        logger.error('Error sharing:', err);
      }
    }
  };

  // ============================================
  // Step renderers
  // ============================================

  const renderChooseMode = () => (
    <>
      {/* Header */}
      <View style={styles.stepHeader}>
        <View style={{ width: 32 }} />
        <Text variant="h3" style={{ color: theme.colors.text.primary }}>
          Invite
        </Text>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text variant="body1" style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chooseModeContent}>
        {/* Send to Friends option */}
        {isLoggedIn && friends.length > 0 && (
          <TouchableOpacity
            style={[styles.modeCard, {
              backgroundColor: theme.colors.primary[500],
            }]}
            onPress={() => setStep('friend-picker')}
          >
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👥</Text>
            <Text variant="body1" style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: 4 }}>
              Send to Friends
            </Text>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Invite friends directly in the app
            </Text>
          </TouchableOpacity>
        )}

        {/* Share a Link option */}
        <TouchableOpacity
          style={[styles.modeCard, {
            backgroundColor: theme.colors.background.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.medium,
          }]}
          onPress={() => setStep('link-options')}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🔗</Text>
          <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600', marginBottom: 4 }}>
            Share a Link
          </Text>
          <Text variant="caption" color="secondary">
            Create a link to share anywhere
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderFriendPicker = () => {
    const selectedFriends = friends.filter(f => selectedFriendIds.has(f.friend_id));

    return (
      <View style={styles.fullHeightStep}>
        {/* Header */}
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('choose-mode')}>
            <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text variant="h4" style={{ color: theme.colors.text.primary }}>
            Select Friends
          </Text>
          <TouchableOpacity
            onPress={() => setStep('message')}
            disabled={selectedFriendIds.size === 0}
          >
            <Text
              variant="body1"
              style={{
                color: selectedFriendIds.size > 0
                  ? theme.colors.primary[500]
                  : theme.colors.text.tertiary,
                fontWeight: '600',
              }}
            >
              Next ({selectedFriendIds.size})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected friends chips */}
        {selectedFriends.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {selectedFriends.map(f => (
              <TouchableOpacity
                key={f.friend_id}
                style={[styles.friendChip, { backgroundColor: theme.colors.primary[100] }]}
                onPress={() => toggleFriendSelection(f.friend_id)}
              >
                <UserAvatar user={f.profile} size={24} />
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary[700], fontWeight: '500', marginLeft: 6 }}
                  numberOfLines={1}
                >
                  {f.profile?.full_name?.split(' ')[0] || f.profile?.username}
                </Text>
                <Text
                  style={{ color: theme.colors.primary[500], marginLeft: 4, fontSize: 12 }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Friend list */}
        <FriendPickerList
          friends={friends}
          selectedIds={selectedFriendIds}
          disabledIds={alreadyInvitedIds ?? new Set()}
          searchQuery={friendSearchQuery}
          onToggle={toggleFriendSelection}
          onSearchChange={setFriendSearchQuery}
        />
      </View>
    );
  };

  const renderMessageStep = () => {
    const selectedCount = selectedFriendIds.size;

    return (
      <>
        {/* Header */}
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('friend-picker')}>
            <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text variant="h4" style={{ color: theme.colors.text.primary }}>
            Add Details
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
            <Text variant="body2" style={{ color: theme.colors.error }}>{error}</Text>
          </View>
        )}

        {/* Sending to N friends */}
        <View style={styles.sendingToRow}>
          {/* Avatar stack */}
          <View style={styles.avatarStack}>
            {friends
              .filter(f => selectedFriendIds.has(f.friend_id))
              .slice(0, 3)
              .map((f, i) => (
                <View key={f.friend_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}>
                  <UserAvatar user={f.profile} size={28} />
                </View>
              ))}
          </View>
          <Text variant="body2" color="secondary" style={{ marginLeft: 8 }}>
            Sending to {selectedCount} friend{selectedCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Message input */}
        <View style={styles.inputContainer}>
          <Text variant="body2" style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Message (optional)
          </Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.light,
            }]}
            value={friendMessage}
            onChangeText={setFriendMessage}
            placeholder="Add a message to your invite..."
            placeholderTextColor={theme.colors.text.tertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Allow Plus Ones */}
        <View style={[styles.optionRow, { borderBottomColor: theme.colors.border.light }]}>
          <View style={styles.optionTextContainer}>
            <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
              Allow Plus Ones
            </Text>
            <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
              Friends can bring guests
            </Text>
          </View>
          <Switch
            value={friendAllowPlusOne}
            onValueChange={setFriendAllowPlusOne}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={friendAllowPlusOne ? theme.colors.primary[600] : theme.colors.gray[100]}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary[500], marginTop: 24 }]}
          onPress={handleSendDirectInvites}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            Send Invites
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderSendingStep = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="body1" style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        Sending invites...
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <>
      <View style={styles.successIcon}>
        <Text style={{ fontSize: 48 }}>✅</Text>
      </View>

      <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
        Invites Sent!
      </Text>
      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {selectedFriendIds.size} friend{selectedFriendIds.size !== 1 ? 's have' : ' has'} been invited to {eventTitle}
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary[500] }]}
        onPress={handleClose}
      >
        <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
          Done
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryTextButton}
        onPress={() => setStep('link-options')}
      >
        <Text variant="body2" style={{ color: theme.colors.primary[500] }}>
          Also share a link
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderLinkOptions = () => (
    <>
      {/* Header */}
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('choose-mode')}>
          <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text variant="h4" style={{ color: theme.colors.text.primary }}>
          Create Invite Link
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Customize how people can respond to your invite
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '20' }]}>
          <Text variant="body2" style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      )}

      <View style={styles.optionsContainer}>
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
            value={linkMessage}
            onChangeText={setLinkMessage}
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

  const renderLinkLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="body1" style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
        Creating your invite link...
      </Text>
    </View>
  );

  const renderLinkShare = () => (
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
          {allowPlusOne ? '✓ Plus ones allowed' : '✗ No plus ones'}
          {usePasscode && passcode ? ` • 🔒 Passcode: ${passcode}` : ''}
        </Text>
      </View>

      {/* Share Actions */}
      <View style={styles.shareActionsContainer}>
        <TouchableOpacity
          style={[styles.copyButton, { borderColor: theme.colors.primary[500] }]}
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

      <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
        <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
          Done
        </Text>
      </TouchableOpacity>
    </>
  );

  // ============================================
  // Determine modal presentation style
  // ============================================

  const isNativeFull = Platform.OS !== 'web' && (
    step === 'friend-picker' || step === 'choose-mode' || step === 'message'
  );

  const renderStepContent = () => {
    switch (step) {
      case 'choose-mode':
        return renderChooseMode();
      case 'friend-picker':
        return renderFriendPicker();
      case 'message':
        return renderMessageStep();
      case 'sending':
        return renderSendingStep();
      case 'success':
        return renderSuccessStep();
      case 'link-options':
        return renderLinkOptions();
      case 'link-loading':
        return renderLinkLoading();
      case 'link-share':
        return renderLinkShare();
    }
  };

  // On mobile, use pageSheet for steps that need full height (friend picker)
  if (Platform.OS !== 'web' && isNativeFull) {
    return (
      <Modal
        visible={visible}
        presentationStyle="pageSheet"
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={[styles.nativeModalContent, { backgroundColor: theme.colors.background.primary }]}>
          {renderStepContent()}
        </View>
      </Modal>
    );
  }

  // Web + non-full-height steps on mobile: centered overlay
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
          maxWidth: Platform.OS === 'web' ? 480 : 400,
        }]}>
          {renderStepContent()}
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
    maxHeight: '90%',
  },
  nativeModalContent: {
    flex: 1,
    paddingTop: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  fullHeightStep: {
    flex: 1,
  },
  chooseModeContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  modeCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  // Friend picker chips
  chipsContainer: {
    maxHeight: 48,
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 20,
  },
  // Message step
  sendingToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Shared styles
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
    marginHorizontal: 16,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  inputContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
  primaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  secondaryTextButton: {
    alignItems: 'center',
    paddingVertical: 12,
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
