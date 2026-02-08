// src/components/HostRsvpModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import {
  getInviteUrl,
  getInvitationRsvps,
  deactivateInvitation,
  reactivateInvitation,
  deleteInvitation,
  getMyInvitationsForEvent,
  EventInvitation,
  RsvpWithProfile,
} from '../api/invitations';
import { logger } from '../utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';

interface HostRsvpModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onCreateNewInvite?: () => void;
}

interface InvitationWithLocalStats extends EventInvitation {
  going_count: number;
  maybe_count: number;
  no_count: number;
  total_rsvps: number;
}

type ModalStep = 'overview' | 'invitation-detail' | 'rsvp-list';
type RsvpFilter = 'all' | 'yes' | 'maybe' | 'no';

export function HostRsvpModal({ visible, onClose, eventId, eventTitle, onCreateNewInvite }: HostRsvpModalProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Data state
  const [invitations, setInvitations] = useState<InvitationWithLocalStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({ going: 0, maybe: 0, no: 0 });

  // UI state
  const [step, setStep] = useState<ModalStep>('overview');
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationWithLocalStats | null>(null);
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(false);
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch invitations when modal opens
  useEffect(() => {
    if (visible && eventId) {
      fetchInvitations();
    }
  }, [visible, eventId]);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const { data, stats, error } = await getMyInvitationsForEvent(eventId);

      if (error || !data) {
        setInvitations([]);
        setTotalStats({ going: 0, maybe: 0, no: 0 });
        return;
      }

      // For each invitation, fetch its individual RSVP stats
      const invitationsWithStats: InvitationWithLocalStats[] = await Promise.all(
        data.map(async (inv) => {
          const { data: rsvpData } = await getInvitationRsvps(inv.id);
          const going = (rsvpData || []).filter(r => r.response === 'yes').length;
          const maybe = (rsvpData || []).filter(r => r.response === 'maybe').length;
          const no = (rsvpData || []).filter(r => r.response === 'no').length;

          return {
            ...inv,
            going_count: going,
            maybe_count: maybe,
            no_count: no,
            total_rsvps: going + maybe + no,
          };
        })
      );

      setInvitations(invitationsWithStats);
      setTotalStats(stats || { going: 0, maybe: 0, no: 0 });
    } catch (err) {
      logger.error('Error fetching invitations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setStep('overview');
    setSelectedInvitation(null);
    setRsvps([]);
    setRsvpFilter('all');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleInvitationPress = async (invitation: InvitationWithLocalStats) => {
    setSelectedInvitation(invitation);
    setStep('invitation-detail');

    // Fetch RSVPs for this invitation
    setRsvpsLoading(true);
    try {
      const { data, error } = await getInvitationRsvps(invitation.id);
      if (!error && data) {
        setRsvps(data);
      }
    } catch (err) {
      logger.error('Error fetching RSVPs:', err);
    } finally {
      setRsvpsLoading(false);
    }
  };

  const handleViewRsvps = () => {
    setStep('rsvp-list');
  };

  const handleBackToOverview = () => {
    setStep('overview');
    setSelectedInvitation(null);
    setRsvps([]);
    setRsvpFilter('all');
  };

  const handleBackToDetail = () => {
    setStep('invitation-detail');
    setRsvpFilter('all');
  };

  const handleCopyLink = async () => {
    if (!selectedInvitation) return;

    const url = getInviteUrl(selectedInvitation.invite_token);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
        Alert.alert('Copied!', 'Link copied to clipboard');
      } else {
        Alert.alert('Share Link', url);
      }
    } catch (err) {
      logger.error('Error copying link:', err);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedInvitation) return;

    setActionLoading(true);
    try {
      if (selectedInvitation.is_active) {
        const { success } = await deactivateInvitation(selectedInvitation.id);
        if (success) {
          await fetchInvitations();
          setSelectedInvitation({ ...selectedInvitation, is_active: false });
          queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });
        } else {
          Alert.alert('Error', 'Failed to pause invitation');
        }
      } else {
        const { success } = await reactivateInvitation(selectedInvitation.id);
        if (success) {
          await fetchInvitations();
          setSelectedInvitation({ ...selectedInvitation, is_active: true });
          queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });
        } else {
          Alert.alert('Error', 'Failed to resume invitation');
        }
      }
    } catch (err) {
      logger.error('Error toggling invitation:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!selectedInvitation) return;

    Alert.alert(
      'Delete Invitation',
      'This will permanently delete this invitation and all its RSVPs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { success } = await deleteInvitation(selectedInvitation.id);
              if (success) {
                await fetchInvitations();
                queryClient.invalidateQueries({ queryKey: ['myEventInvitations', eventId] });
                handleBackToOverview();
              } else {
                Alert.alert('Error', 'Failed to delete invitation');
              }
            } catch (err) {
              logger.error('Error deleting invitation:', err);
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredRsvps = rsvps.filter(rsvp => {
    if (rsvpFilter === 'all') return true;
    return rsvp.response === rsvpFilter;
  });

  const renderOverview = () => {
    return (
      <>
        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
          Manage Your Invites
        </Text>
        <Text variant="body2" style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          {eventTitle}
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
            <Text variant="body1" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
              No invitations created yet
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.background.secondary }]}>
              <Text variant="body2" style={{ color: theme.colors.text.secondary, marginBottom: 12 }}>
                Total Responses
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text variant="h2" style={{ color: theme.colors.success }}>
                    {totalStats.going}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                    Going
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="h2" style={{ color: theme.colors.warning }}>
                    {totalStats.maybe}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                    Maybe
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="h2" style={{ color: theme.colors.error }}>
                    {totalStats.no}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                    No
                  </Text>
                </View>
              </View>
            </View>

            {/* Invitations List */}
            <Text variant="body2" style={{ color: theme.colors.text.secondary, marginBottom: 12, marginTop: 8 }}>
              Your Invite Links ({invitations.length})
            </Text>
            <ScrollView style={styles.invitationsList} showsVerticalScrollIndicator={false}>
              {invitations.map((invitation, index) => (
                <TouchableOpacity
                  key={invitation.id}
                  style={[styles.invitationCard, {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: invitation.is_active ? theme.colors.border.light : theme.colors.warning,
                    opacity: invitation.is_active ? 1 : 0.7,
                  }]}
                  onPress={() => handleInvitationPress(invitation)}
                >
                  <View style={styles.invitationHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                        Invite Link #{index + 1}
                      </Text>
                      {!invitation.is_active && (
                        <Text variant="caption" style={{ color: theme.colors.warning }}>
                          Paused
                        </Text>
                      )}
                    </View>
                    <Text variant="body2" style={{ color: theme.colors.text.tertiary }}>
                      {invitation.view_count} views
                    </Text>
                  </View>

                  <View style={styles.invitationStats}>
                    <View style={styles.miniStat}>
                      <Text variant="body2" style={{ color: theme.colors.success, fontWeight: '600' }}>
                        {invitation.going_count}
                      </Text>
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary }}> going</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Text variant="body2" style={{ color: theme.colors.warning, fontWeight: '600' }}>
                        {invitation.maybe_count}
                      </Text>
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary }}> maybe</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Text variant="body2" style={{ color: theme.colors.error, fontWeight: '600' }}>
                        {invitation.no_count}
                      </Text>
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary }}> no</Text>
                    </View>
                  </View>

                  <View style={styles.invitationMeta}>
                    {invitation.passcode && (
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                        🔒 Passcode
                      </Text>
                    )}
                    {invitation.allow_plus_one && (
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginLeft: 8 }}>
                        +1 Allowed
                      </Text>
                    )}
                    {invitation.max_uses && (
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginLeft: 8 }}>
                        {invitation.use_count}/{invitation.max_uses} uses
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Create New Invite Button */}
        {onCreateNewInvite && (
          <TouchableOpacity
            style={[styles.createNewButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => {
              handleClose();
              onCreateNewInvite();
            }}
          >
            <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
              + Create New Invite
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
          <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
            Done
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderInvitationDetail = () => {
    if (!selectedInvitation) return null;

    const inviteUrl = getInviteUrl(selectedInvitation.invite_token);

    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToOverview}>
          <Text variant="body2" style={{ color: theme.colors.primary[600] }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
          Invitation Details
        </Text>

        {/* Status Badge */}
        <View style={[styles.statusBadge, {
          backgroundColor: selectedInvitation.is_active ? theme.colors.success + '20' : theme.colors.warning + '20',
        }]}>
          <Text variant="body2" style={{
            color: selectedInvitation.is_active ? theme.colors.success : theme.colors.warning,
            fontWeight: '600',
          }}>
            {selectedInvitation.is_active ? '✓ Active' : '⏸ Paused'}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.background.secondary, marginTop: 16 }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="h2" style={{ color: theme.colors.success }}>
                {selectedInvitation.going_count}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                Going
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" style={{ color: theme.colors.warning }}>
                {selectedInvitation.maybe_count}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                Maybe
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" style={{ color: theme.colors.error }}>
                {selectedInvitation.no_count}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                No
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="h2" style={{ color: theme.colors.text.secondary }}>
                {selectedInvitation.view_count}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                Views
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Summary */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.background.secondary }]}>
          <Text variant="body2" style={{ color: theme.colors.text.secondary, marginBottom: 8 }}>
            Settings
          </Text>
          <View style={styles.settingsRow}>
            <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
              {selectedInvitation.allow_plus_one ? '✓' : '✗'} Plus ones
            </Text>
            <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginLeft: 12 }}>
              {selectedInvitation.passcode ? '🔒' : '🔓'} Passcode
            </Text>
          </View>
          {selectedInvitation.max_uses && (
            <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginTop: 4 }}>
              Limited to {selectedInvitation.max_uses} uses ({selectedInvitation.use_count} used)
            </Text>
          )}
        </View>

        {/* Link Box */}
        <View style={[styles.urlBox, {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.light,
        }]}>
          <Text
            variant="caption"
            style={{ color: theme.colors.text.secondary }}
            numberOfLines={1}
            selectable
          >
            {inviteUrl}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: theme.colors.primary[500] }]}
            onPress={handleCopyLink}
          >
            <Text variant="body2" style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
              📋 Copy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, {
              borderColor: selectedInvitation.is_active ? theme.colors.warning : theme.colors.success,
            }]}
            onPress={handleToggleActive}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            ) : (
              <Text variant="body2" style={{
                color: selectedInvitation.is_active ? theme.colors.warning : theme.colors.success,
                fontWeight: '600',
              }}>
                {selectedInvitation.is_active ? '⏸ Pause' : '▶ Resume'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* View RSVPs Button */}
        <TouchableOpacity
          style={[styles.viewRsvpsButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handleViewRsvps}
        >
          <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            View RSVPs ({selectedInvitation.total_rsvps})
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteInvitation}
          disabled={actionLoading}
        >
          <Text variant="body2" style={{ color: theme.colors.error }}>
            Delete Invitation
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderRsvpList = () => {
    if (!selectedInvitation) return null;

    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToDetail}>
          <Text variant="body2" style={{ color: theme.colors.primary[600] }}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
          RSVPs
        </Text>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'yes', 'maybe', 'no'] as RsvpFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, {
                backgroundColor: rsvpFilter === filter ? theme.colors.primary[500] : 'transparent',
                borderColor: theme.colors.primary[500],
              }]}
              onPress={() => setRsvpFilter(filter)}
            >
              <Text variant="caption" style={{
                color: rsvpFilter === filter ? theme.colors.text.inverse : theme.colors.primary[600],
                fontWeight: '600',
                textTransform: 'capitalize',
              }}>
                {filter === 'all' ? 'All' : filter === 'yes' ? 'Going' : filter === 'maybe' ? 'Maybe' : 'No'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {rsvpsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : filteredRsvps.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="body1" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
              No RSVPs to show
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.rsvpsList} showsVerticalScrollIndicator={false}>
            {filteredRsvps.map((rsvp) => (
              <View
                key={rsvp.rsvp_id}
                style={[styles.rsvpCard, { backgroundColor: theme.colors.background.secondary }]}
              >
                <View style={styles.rsvpInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                    <Text style={{ fontSize: 16 }}>
                      {rsvp.full_name?.[0] || rsvp.username?.[0] || '?'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                      {rsvp.full_name || rsvp.username || 'Unknown'}
                    </Text>
                    {rsvp.username && (
                      <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                        @{rsvp.username}
                      </Text>
                    )}
                    {rsvp.plus_one_count > 0 && (
                      <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                        +{rsvp.plus_one_count} guest{rsvp.plus_one_count > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.responseBadge, {
                  backgroundColor: rsvp.response === 'yes'
                    ? theme.colors.success + '20'
                    : rsvp.response === 'maybe'
                    ? theme.colors.warning + '20'
                    : theme.colors.error + '20',
                }]}>
                  <Text variant="caption" style={{
                    color: rsvp.response === 'yes'
                      ? theme.colors.success
                      : rsvp.response === 'maybe'
                      ? theme.colors.warning
                      : theme.colors.error,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {rsvp.response === 'yes' ? 'Going' : rsvp.response === 'maybe' ? 'Maybe' : 'No'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
          <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
            Done
          </Text>
        </TouchableOpacity>
      </>
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
          {step === 'overview' && renderOverview()}
          {step === 'invitation-detail' && renderInvitationDetail()}
          {step === 'rsvp-list' && renderRsvpList()}
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
    maxWidth: 420,
    maxHeight: '85%',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  invitationsList: {
    maxHeight: 300,
  },
  invitationCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invitationStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  createNewButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  settingsCard: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  urlBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  viewRsvpsButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  rsvpsList: {
    maxHeight: 350,
  },
  rsvpCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rsvpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
