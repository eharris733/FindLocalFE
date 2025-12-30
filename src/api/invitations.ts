// src/api/invitations.ts
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { Profile } from './profiles';

// ============================================
// Types
// ============================================

export interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invite_token: string;
  passcode?: string | null;
  allow_anonymous_rsvp: boolean;
  allow_plus_one: boolean;
  max_uses?: number | null;
  use_count: number;
  view_count: number;
  expires_at?: string | null;
  is_active: boolean;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitationDetails {
  id: string;
  event_id: string;
  inviter_id: string;
  inviter_username?: string | null;
  inviter_name?: string | null;
  passcode_required: boolean;
  allow_anonymous_rsvp: boolean;
  allow_plus_one: boolean;
  message?: string | null;
  is_valid: boolean;
  expires_at?: string | null;
}

export interface EventRsvp {
  id: string;
  invitation_id: string;
  event_id: string;
  user_id?: string | null;
  anonymous_name?: string | null;
  response: 'yes' | 'no' | 'maybe';
  plus_one_count: number;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: Profile;
}

export interface RsvpWithProfile {
  rsvp_id: string;
  user_id?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  anonymous_name?: string | null;
  response: 'yes' | 'no' | 'maybe';
  plus_one_count: number;
  created_at: string;
}

export interface InvitationWithStats {
  invitation_id: string;
  invite_token: string;
  passcode_enabled: boolean;
  allow_anonymous_rsvp: boolean;
  allow_plus_one: boolean;
  max_uses?: number | null;
  use_count: number;
  view_count: number;
  is_active: boolean;
  created_at: string;
  rsvp_count: number;
  yes_count: number;
  maybe_count: number;
  no_count: number;
}

export interface EventSocialStats {
  share_count: number;
  rsvp_yes_count: number;
  rsvp_maybe_count: number;
  rsvp_no_count: number;
  total_attending: number;
}

export interface CreateInvitationParams {
  eventId: string;
  passcode?: string;
  allowAnonymous?: boolean;
  allowPlusOne?: boolean;
  maxUses?: number;
  expiresAt?: Date;
  message?: string;
}

export interface SubmitRsvpParams {
  token: string;
  response: 'yes' | 'no' | 'maybe';
  passcode?: string;
  anonymousName?: string;
  plusOneCount?: number;
}

// ============================================
// Create Invitations
// ============================================

/**
 * Create a new event invitation
 */
export async function createEventInvitation(
  params: CreateInvitationParams
): Promise<{ data: { id: string; token: string } | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('create_event_invitation', {
      p_event_id: params.eventId,
      p_passcode: params.passcode || null,
      p_allow_anonymous: params.allowAnonymous ?? true,
      p_allow_plus_one: params.allowPlusOne ?? false,
      p_max_uses: params.maxUses || null,
      p_expires_at: params.expiresAt?.toISOString() || null,
      p_message: params.message || null,
    });

    if (error) {
      logger.error('Error creating invitation:', error);
      return { data: null, error };
    }

    // Get the token for the created invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('event_invitations')
      .select('id, invite_token')
      .eq('id', data)
      .single();

    if (fetchError) {
      logger.error('Error fetching invitation:', fetchError);
      return { data: null, error: fetchError };
    }

    return {
      data: { id: invitation.id, token: invitation.invite_token },
      error: null,
    };
  } catch (err) {
    logger.error('Error in createEventInvitation:', err);
    return { data: null, error: err };
  }
}

/**
 * Get invitation details by token (for RSVP flow)
 */
export async function getInvitationByToken(
  token: string
): Promise<{ data: InvitationDetails | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_invitation_by_token', {
      p_token: token,
    });

    if (error) {
      logger.error('Error getting invitation:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: 'Invitation not found' } };
    }

    return { data: data[0] as InvitationDetails, error: null };
  } catch (err) {
    logger.error('Error in getInvitationByToken:', err);
    return { data: null, error: err };
  }
}

// ============================================
// RSVP Functions
// ============================================

/**
 * Submit an RSVP to an invitation
 */
export async function submitRsvp(
  params: SubmitRsvpParams
): Promise<{ success: boolean; rsvpId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('submit_rsvp', {
      p_token: params.token,
      p_response: params.response,
      p_passcode: params.passcode || null,
      p_anonymous_name: params.anonymousName || null,
      p_plus_one_count: params.plusOneCount || 0,
    });

    if (error) {
      logger.error('Error submitting RSVP:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Failed to submit RSVP' };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error_message };
    }

    return { success: true, rsvpId: result.rsvp_id };
  } catch (err: any) {
    logger.error('Error in submitRsvp:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get current user's RSVP for an invitation
 */
export async function getUserRsvp(
  invitationId: string
): Promise<{ data: EventRsvp | null; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('invitation_id', invitationId)
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error getting user RSVP:', error);
      return { data: null, error };
    }

    return { data: data as EventRsvp | null, error: null };
  } catch (err) {
    logger.error('Error in getUserRsvp:', err);
    return { data: null, error: err };
  }
}

// ============================================
// Host Functions (View RSVPs)
// ============================================

/**
 * Get all RSVPs for an invitation (host only)
 */
export async function getInvitationRsvps(
  invitationId: string
): Promise<{ data: RsvpWithProfile[]; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_invitation_rsvps', {
      p_invitation_id: invitationId,
    });

    if (error) {
      logger.error('Error getting invitation RSVPs:', error);
      return { data: [], error };
    }

    return { data: data as RsvpWithProfile[], error: null };
  } catch (err) {
    logger.error('Error in getInvitationRsvps:', err);
    return { data: [], error: err };
  }
}

/**
 * Get all invitations with RSVP stats for an event (host only)
 */
export async function getEventInvitationsWithRsvps(
  eventId: string
): Promise<{ data: InvitationWithStats[]; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_event_invitations_with_rsvps', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error getting event invitations:', error);
      return { data: [], error };
    }

    return { data: data as InvitationWithStats[], error: null };
  } catch (err) {
    logger.error('Error in getEventInvitationsWithRsvps:', err);
    return { data: [], error: err };
  }
}

/**
 * Get invitations created by the current user
 */
export async function getMyInvitations(): Promise<{ data: EventInvitation[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase
      .from('event_invitations')
      .select('*')
      .eq('inviter_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting my invitations:', error);
      return { data: [], error };
    }

    return { data: data as EventInvitation[], error: null };
  } catch (err) {
    logger.error('Error in getMyInvitations:', err);
    return { data: [], error: err };
  }
}

// ============================================
// Manage Invitations
// ============================================

/**
 * Deactivate an invitation
 */
export async function deactivateInvitation(
  invitationId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('event_invitations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) {
      logger.error('Error deactivating invitation:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in deactivateInvitation:', err);
    return { success: false, error: err };
  }
}

/**
 * Reactivate an invitation
 */
export async function reactivateInvitation(
  invitationId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('event_invitations')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) {
      logger.error('Error reactivating invitation:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in reactivateInvitation:', err);
    return { success: false, error: err };
  }
}

/**
 * Delete an invitation (and all its RSVPs)
 */
export async function deleteInvitation(
  invitationId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('event_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      logger.error('Error deleting invitation:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in deleteInvitation:', err);
    return { success: false, error: err };
  }
}

/**
 * Remove an RSVP (host can remove anonymous RSVPs)
 */
export async function removeRsvp(rsvpId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('id', rsvpId);

    if (error) {
      logger.error('Error removing RSVP:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in removeRsvp:', err);
    return { success: false, error: err };
  }
}

// ============================================
// Social Stats
// ============================================

/**
 * Get social stats for an event
 */
export async function getEventSocialStats(
  eventId: string
): Promise<{ data: EventSocialStats; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_event_social_stats', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error getting event social stats:', error);
      return {
        data: {
          share_count: 0,
          rsvp_yes_count: 0,
          rsvp_maybe_count: 0,
          rsvp_no_count: 0,
          total_attending: 0,
        },
        error,
      };
    }

    if (!data || data.length === 0) {
      return {
        data: {
          share_count: 0,
          rsvp_yes_count: 0,
          rsvp_maybe_count: 0,
          rsvp_no_count: 0,
          total_attending: 0,
        },
        error: null,
      };
    }

    return { data: data[0] as EventSocialStats, error: null };
  } catch (err) {
    logger.error('Error in getEventSocialStats:', err);
    return {
      data: {
        share_count: 0,
        rsvp_yes_count: 0,
        rsvp_maybe_count: 0,
        rsvp_no_count: 0,
        total_attending: 0,
      },
      error: err,
    };
  }
}

// ============================================
// URL Helpers
// ============================================

/**
 * Generate the full invite URL for sharing
 */
export function getInviteUrl(token: string, baseUrl?: string): string {
  let base = baseUrl;
  if (!base) {
    base = globalThis.window?.location?.origin ?? 'https://findlocal.community';
  }
  return `${base}/invite/${token}`;
}

/**
 * Get the event URL with invite token as query param
 */
export function getEventInviteUrl(eventId: string, token: string, baseUrl?: string): string {
  let base = baseUrl;
  if (!base) {
    base = globalThis.window?.location?.origin ?? 'https://findlocal.community';
  }
  return `${base}/event/${eventId}?invite=${token}`;
}
