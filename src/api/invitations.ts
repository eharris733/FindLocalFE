// src/api/invitations.ts
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { analytics } from '../utils/analytics';
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
  response: 'yes' | 'no' | 'maybe';
  plus_one_count: number;
  created_at: string;
}

export interface InvitationWithStats {
  invitation_id: string;
  invite_token: string;
  passcode_enabled: boolean;
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
  allowPlusOne?: boolean;
  maxUses?: number;
  expiresAt?: Date;
  message?: string;
}

export interface SubmitRsvpParams {
  token: string;
  response: 'yes' | 'no' | 'maybe';
  passcode?: string;
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
      p_allow_anonymous: false,
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

    // Track analytics
    analytics.trackSocialMetric({
      actionType: 'invitation_created',
      targetId: params.eventId,
      targetType: 'event',
      source: 'event_page',
      metadata: {
        allowPlusOne: params.allowPlusOne,
        hasMaxUses: !!params.maxUses,
        hasExpiry: !!params.expiresAt,
      },
    });

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

    // Track analytics - invitation viewed
    analytics.trackSocialMetric({
      actionType: 'invitation_viewed',
      targetId: token,
      targetType: 'invitation',
      source: 'invite_page',
    });

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
      p_anonymous_name: null,
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

    // Track analytics
    analytics.trackSocialMetric({
      actionType: 'rsvp_submitted',
      targetId: params.token,
      targetType: 'invitation',
      source: 'invite_page',
      metadata: {
        response: params.response,
        hasPlusOne: (params.plusOneCount || 0) > 0,
      },
    });

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

/**
 * Get user's RSVP status for an event (across all invitations)
 * Returns the user's RSVP if they have one, regardless of which invitation link they used
 */
export async function getUserEventRsvpStatus(
  eventId: string
): Promise<{ data: EventRsvp | null; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: null, error: null }; // Not authenticated is OK, just no RSVP
    }

    const { data, error } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error getting user event RSVP:', error);
      return { data: null, error };
    }

    return { data: data as EventRsvp | null, error: null };
  } catch (err) {
    logger.error('Error in getUserEventRsvpStatus:', err);
    return { data: null, error: err };
  }
}

/**
 * Get attendee list for an event (public RSVPs only)
 * Returns users who are going/maybe with public visibility
 */
export async function getEventAttendees(
  eventId: string,
  limit: number = 10
): Promise<{ data: RsvpWithProfile[]; going: number; maybe: number; error: any }> {
  try {
    // Get all RSVPs for this event
    const { data: rsvps, error } = await supabase
      .from('event_rsvps')
      .select('id, user_id, response, plus_one_count, created_at')
      .eq('event_id', eventId)
      .in('response', ['yes', 'maybe'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error getting event attendees:', error);
      return { data: [], going: 0, maybe: 0, error };
    }

    // Get unique user IDs
    const userIds = [...new Set(rsvps?.filter(r => r.user_id).map(r => r.user_id) || [])];

    // Fetch profiles for those users
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Format the data
    const attendees: RsvpWithProfile[] = (rsvps || []).map((rsvp: any) => {
      const profile = rsvp.user_id ? profilesMap[rsvp.user_id] : null;
      return {
        rsvp_id: rsvp.id,
        user_id: rsvp.user_id,
        username: profile?.username,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        response: rsvp.response,
        plus_one_count: rsvp.plus_one_count,
        created_at: rsvp.created_at,
      };
    });

    // Get counts for all RSVPs (not just limited)
    const { data: counts } = await supabase
      .from('event_rsvps')
      .select('response')
      .eq('event_id', eventId);

    const goingCount = (counts || []).filter((r: any) => r.response === 'yes').length;
    const maybeCount = (counts || []).filter((r: any) => r.response === 'maybe').length;

    return {
      data: attendees,
      going: goingCount,
      maybe: maybeCount,
      error: null,
    };
  } catch (err) {
    logger.error('Error in getEventAttendees:', err);
    return { data: [], going: 0, maybe: 0, error: err };
  }
}

/**
 * Update an existing RSVP response
 */
export async function updateRsvp(
  rsvpId: string,
  response: 'yes' | 'no' | 'maybe',
  plusOneCount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('event_rsvps')
      .update({
        response,
        plus_one_count: plusOneCount ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rsvpId);

    if (error) {
      logger.error('Error updating RSVP:', error);
      return { success: false, error: error.message };
    }

    analytics.trackSocialMetric({
      actionType: 'rsvp_updated',
      targetId: rsvpId,
      targetType: 'rsvp',
      source: 'event_page',
      metadata: { response },
    });

    return { success: true };
  } catch (err: any) {
    logger.error('Error in updateRsvp:', err);
    return { success: false, error: err.message };
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

/**
 * Get invitations created by the current user for a specific event
 * Returns invitation stats if user has created invites for this event
 */
export async function getMyInvitationsForEvent(
  eventId: string
): Promise<{ data: EventInvitation[]; stats: { going: number; maybe: number; no: number; total: number } | null; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], stats: null, error: null };
    }

    // Get user's invitations for this event
    const { data: invitations, error } = await supabase
      .from('event_invitations')
      .select('*')
      .eq('inviter_id', user.user.id)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting my invitations for event:', error);
      return { data: [], stats: null, error };
    }

    if (!invitations || invitations.length === 0) {
      return { data: [], stats: null, error: null };
    }

    // Get RSVP stats for these invitations
    const invitationIds = invitations.map(inv => inv.id);
    const { data: rsvps, error: rsvpError } = await supabase
      .from('event_rsvps')
      .select('response')
      .in('invitation_id', invitationIds);

    if (rsvpError) {
      logger.warn('Could not fetch RSVP stats:', rsvpError);
    }

    const stats = {
      going: (rsvps || []).filter(r => r.response === 'yes').length,
      maybe: (rsvps || []).filter(r => r.response === 'maybe').length,
      no: (rsvps || []).filter(r => r.response === 'no').length,
      total: (rsvps || []).length,
    };

    return { data: invitations as EventInvitation[], stats, error: null };
  } catch (err) {
    logger.error('Error in getMyInvitationsForEvent:', err);
    return { data: [], stats: null, error: err };
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
 * Remove an RSVP (host can remove RSVPs from their invitations)
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
// User RSVPs & Pending Invitations (Home Page)
// ============================================

/**
 * Get user's upcoming RSVPs (events they're attending)
 * Returns events where the user has responded 'yes' or 'maybe'
 */
export async function getUserUpcomingRsvps(): Promise<{
  data: Array<{ event_id: string; response: 'yes' | 'no' | 'maybe'; rsvp_id: string; created_at: string }>;
  error: any;
}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: null };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('event_rsvps')
      .select(`
        id,
        event_id,
        response,
        created_at
      `)
      .eq('user_id', user.user.id)
      .in('response', ['yes', 'maybe'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting user upcoming RSVPs:', error);
      return { data: [], error };
    }

    return {
      data: (data || []).map((rsvp: any) => ({
        event_id: rsvp.event_id,
        response: rsvp.response,
        rsvp_id: rsvp.id,
        created_at: rsvp.created_at,
      })),
      error: null,
    };
  } catch (err) {
    logger.error('Error in getUserUpcomingRsvps:', err);
    return { data: [], error: err };
  }
}

/**
 * Get pending event invitations TO the user (unanswered)
 * Returns invitations where user hasn't RSVPed yet
 */
export async function getPendingInvitationsToUser(): Promise<{
  data: Array<{
    invitation_id: string;
    event_id: string;
    inviter_id: string;
    inviter_username?: string | null;
    inviter_name?: string | null;
    inviter_avatar?: string | null;
    message?: string | null;
    created_at: string;
  }>;
  error: any;
}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase.rpc('get_pending_direct_invites');

    if (error) {
      logger.error('Error getting pending direct invites:', error);
      return { data: [], error };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Get events user already RSVPed to, so we can filter those out
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.user.id)
      .in('response', ['yes', 'maybe']);

    const rsvpedEventIds = new Set((rsvps || []).map((r: any) => r.event_id));

    const filtered = (data as any[])
      .filter(inv => !rsvpedEventIds.has(inv.event_id))
      .map(inv => ({
        invitation_id: inv.invite_id,
        event_id: inv.event_id,
        inviter_id: inv.sender_id,
        inviter_username: inv.sender_username,
        inviter_name: inv.sender_name,
        inviter_avatar: inv.sender_avatar,
        message: inv.message,
        created_at: inv.created_at,
      }));

    return { data: filtered, error: null };
  } catch (err) {
    logger.error('Error in getPendingInvitationsToUser:', err);
    return { data: [], error: err };
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

// ============================================
// User Event History
// ============================================

export interface UserEventHistoryItem {
  event_id: string;
  event_title: string | null;
  event_date: string | null;
  event_image_url: string | null;
  venue_name: string | null;
  venue_id: string | null;
  response: 'yes' | 'no' | 'maybe';
  rsvp_date: string;
  is_past: boolean;
  friends_attending?: Array<{
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

export interface UserHostedEventItem {
  event_id: string;
  event_title: string | null;
  event_date: string | null;
  event_image_url: string | null;
  venue_name: string | null;
  venue_id: string | null;
  invitation_count: number;
  total_rsvps: number;
  yes_count: number;
  maybe_count: number;
  created_at: string;
  is_past: boolean;
}

/**
 * Get user's event history (past events they attended)
 * Returns events where the user RSVPed 'yes' or 'maybe' and the event date has passed
 */
export async function getUserEventHistory(options?: {
  includeFriends?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: UserEventHistoryItem[]; total: number; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], total: 0, error: { message: 'Not authenticated' } };
    }

    const today = new Date().toISOString().split('T')[0];
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get user's RSVPs
    const { data: rsvps, error: rsvpError, count } = await supabase
      .from('event_rsvps')
      .select('id, event_id, response, created_at', { count: 'exact' })
      .eq('user_id', user.user.id)
      .in('response', ['yes', 'maybe'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rsvpError) {
      logger.error('Error getting user event history:', rsvpError);
      return { data: [], total: 0, error: rsvpError };
    }

    if (!rsvps || rsvps.length === 0) {
      return { data: [], total: 0, error: null };
    }

    const eventIds = rsvps.map(r => r.event_id);

    // Try to get events from events_gold first, then old_events for any missing
    const { data: goldEvents } = await supabase
      .from('events_gold')
      .select('id, title, event_date, image_url, venue_id')
      .in('id', eventIds);

    const foundGoldIds = new Set((goldEvents || []).map(e => e.id));
    const missingIds = eventIds.filter(id => !foundGoldIds.has(id));

    let oldEvents: any[] = [];
    if (missingIds.length > 0) {
      const { data: archived } = await supabase
        .from('old_events')
        .select('id, title, event_date, image_url, venue_id')
        .in('id', missingIds);
      oldEvents = archived || [];
    }

    const allEvents = [...(goldEvents || []), ...oldEvents];
    const eventMap = new Map(allEvents.map(e => [e.id, e]));

    // Get venue names
    const venueIds = [...new Set(allEvents.map(e => e.venue_id).filter(Boolean))];
    let venueMap = new Map<string, string>();
    if (venueIds.length > 0) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds);
      venueMap = new Map((venues || []).map(v => [v.id, v.name]));
    }

    // Get friends attending (if requested)
    let friendsAttendingMap = new Map<string, any[]>();
    if (options?.includeFriends) {
      // Get user's friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.user.id},user_id_2.eq.${user.user.id}`);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f =>
          f.user_id_1 === user.user.id ? f.user_id_2 : f.user_id_1
        );

        // Get friend RSVPs for same events
        const { data: friendRsvps } = await supabase
          .from('event_rsvps')
          .select('event_id, user_id')
          .in('user_id', friendIds)
          .in('event_id', eventIds)
          .in('response', ['yes', 'maybe']);

        if (friendRsvps && friendRsvps.length > 0) {
          // Get friend profiles
          const friendUserIds = [...new Set(friendRsvps.map(r => r.user_id))];
          const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', friendUserIds);

          const profileMap = new Map((friendProfiles || []).map(p => [p.id, p]));

          // Group by event
          for (const rsvp of friendRsvps) {
            const profile = profileMap.get(rsvp.user_id);
            if (profile) {
              const existing = friendsAttendingMap.get(rsvp.event_id) || [];
              existing.push({
                user_id: profile.id,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              });
              friendsAttendingMap.set(rsvp.event_id, existing);
            }
          }
        }
      }
    }

    // Build the result
    const historyItems: UserEventHistoryItem[] = rsvps.map(rsvp => {
      const event = eventMap.get(rsvp.event_id);
      const eventDate = event?.event_date?.split('T')[0] || null;
      const isPast = eventDate ? eventDate < today : false;

      return {
        event_id: rsvp.event_id,
        event_title: event?.title || null,
        event_date: event?.event_date || null,
        event_image_url: event?.image_url || null,
        venue_name: event?.venue_id ? venueMap.get(event.venue_id) || null : null,
        venue_id: event?.venue_id || null,
        response: rsvp.response as 'yes' | 'no' | 'maybe',
        rsvp_date: rsvp.created_at,
        is_past: isPast,
        friends_attending: friendsAttendingMap.get(rsvp.event_id) || [],
      };
    });

    return { data: historyItems, total: count || historyItems.length, error: null };
  } catch (err) {
    logger.error('Error in getUserEventHistory:', err);
    return { data: [], total: 0, error: err };
  }
}

/**
 * Get events the user has hosted (created invitations for)
 */
export async function getUserHostedEvents(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: UserHostedEventItem[]; total: number; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], total: 0, error: { message: 'Not authenticated' } };
    }

    const today = new Date().toISOString().split('T')[0];
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get invitations created by user, grouped by event
    const { data: invitations, error: invError } = await supabase
      .from('event_invitations')
      .select('id, event_id, created_at')
      .eq('inviter_id', user.user.id)
      .order('created_at', { ascending: false });

    if (invError) {
      logger.error('Error getting user hosted events:', invError);
      return { data: [], total: 0, error: invError };
    }

    if (!invitations || invitations.length === 0) {
      return { data: [], total: 0, error: null };
    }

    // Group invitations by event
    const eventInvitations = new Map<string, any[]>();
    for (const inv of invitations) {
      const existing = eventInvitations.get(inv.event_id) || [];
      existing.push(inv);
      eventInvitations.set(inv.event_id, existing);
    }

    const eventIds = [...eventInvitations.keys()];
    const total = eventIds.length;

    // Apply pagination to unique event IDs
    const paginatedEventIds = eventIds.slice(offset, offset + limit);

    // Try to get events from events_gold first, then old_events
    const { data: goldEvents } = await supabase
      .from('events_gold')
      .select('id, title, event_date, image_url, venue_id')
      .in('id', paginatedEventIds);

    const foundGoldIds = new Set((goldEvents || []).map(e => e.id));
    const missingIds = paginatedEventIds.filter(id => !foundGoldIds.has(id));

    let oldEvents: any[] = [];
    if (missingIds.length > 0) {
      const { data: archived } = await supabase
        .from('old_events')
        .select('id, title, event_date, image_url, venue_id')
        .in('id', missingIds);
      oldEvents = archived || [];
    }

    const allEvents = [...(goldEvents || []), ...oldEvents];
    const eventMap = new Map(allEvents.map(e => [e.id, e]));

    // Get venue names
    const venueIds = [...new Set(allEvents.map(e => e.venue_id).filter(Boolean))];
    let venueMap = new Map<string, string>();
    if (venueIds.length > 0) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds);
      venueMap = new Map((venues || []).map(v => [v.id, v.name]));
    }

    // Get RSVP counts for all invitations
    const allInvitationIds = invitations
      .filter(inv => paginatedEventIds.includes(inv.event_id))
      .map(inv => inv.id);

    const { data: rsvpCounts } = await supabase
      .from('event_rsvps')
      .select('invitation_id, response')
      .in('invitation_id', allInvitationIds);

    // Build RSVP stats per event
    const eventRsvpStats = new Map<string, { total: number; yes: number; maybe: number }>();
    for (const eventId of paginatedEventIds) {
      eventRsvpStats.set(eventId, { total: 0, yes: 0, maybe: 0 });
    }

    if (rsvpCounts) {
      // Map invitation IDs to event IDs
      const invToEvent = new Map(invitations.map(inv => [inv.id, inv.event_id]));

      for (const rsvp of rsvpCounts) {
        const eventId = invToEvent.get(rsvp.invitation_id);
        if (eventId && eventRsvpStats.has(eventId)) {
          const stats = eventRsvpStats.get(eventId)!;
          stats.total++;
          if (rsvp.response === 'yes') stats.yes++;
          if (rsvp.response === 'maybe') stats.maybe++;
        }
      }
    }

    // Build the result
    const hostedItems: UserHostedEventItem[] = paginatedEventIds.map(eventId => {
      const event = eventMap.get(eventId);
      const invs = eventInvitations.get(eventId) || [];
      const stats = eventRsvpStats.get(eventId) || { total: 0, yes: 0, maybe: 0 };
      const eventDate = event?.event_date?.split('T')[0] || null;
      const isPast = eventDate ? eventDate < today : false;

      return {
        event_id: eventId,
        event_title: event?.title || null,
        event_date: event?.event_date || null,
        event_image_url: event?.image_url || null,
        venue_name: event?.venue_id ? venueMap.get(event.venue_id) || null : null,
        venue_id: event?.venue_id || null,
        invitation_count: invs.length,
        total_rsvps: stats.total,
        yes_count: stats.yes,
        maybe_count: stats.maybe,
        created_at: invs[0]?.created_at || '',
        is_past: isPast,
      };
    });

    return { data: hostedItems, total, error: null };
  } catch (err) {
    logger.error('Error in getUserHostedEvents:', err);
    return { data: [], total: 0, error: err };
  }
}

/**
 * Get count of past events user attended
 */
export async function getUserAttendedCount(): Promise<{ count: number; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { count: 0, error: null };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get user's RSVPs with yes/maybe
    const { data: rsvps, error: rsvpError } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.user.id)
      .in('response', ['yes', 'maybe']);

    if (rsvpError || !rsvps) {
      return { count: 0, error: rsvpError };
    }

    if (rsvps.length === 0) {
      return { count: 0, error: null };
    }

    const eventIds = rsvps.map(r => r.event_id);

    // Check events_gold for past events
    const { data: goldEvents } = await supabase
      .from('events_gold')
      .select('id')
      .in('id', eventIds)
      .lt('event_date', today);

    const goldCount = goldEvents?.length || 0;

    // Check old_events (all are past by definition)
    const foundGoldIds = new Set((goldEvents || []).map(e => e.id));
    const missingIds = eventIds.filter(id => !foundGoldIds.has(id));

    let oldCount = 0;
    if (missingIds.length > 0) {
      const { data: oldEvents } = await supabase
        .from('old_events')
        .select('id')
        .in('id', missingIds);
      oldCount = oldEvents?.length || 0;
    }

    return { count: goldCount + oldCount, error: null };
  } catch (err) {
    logger.error('Error in getUserAttendedCount:', err);
    return { count: 0, error: err };
  }
}

/**
 * Get mutual attendance with a specific friend
 * Returns events where both the current user and the friend attended
 */
export async function getMutualEventsWithFriend(
  friendUserId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ data: UserEventHistoryItem[]; total: number; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], total: 0, error: { message: 'Not authenticated' } };
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get current user's RSVPs
    const { data: myRsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.user.id)
      .in('response', ['yes', 'maybe']);

    if (!myRsvps || myRsvps.length === 0) {
      return { data: [], total: 0, error: null };
    }

    const myEventIds = myRsvps.map(r => r.event_id);

    // Get friend's RSVPs for same events
    const { data: friendRsvps, count } = await supabase
      .from('event_rsvps')
      .select('event_id, response, created_at', { count: 'exact' })
      .eq('user_id', friendUserId)
      .in('event_id', myEventIds)
      .in('response', ['yes', 'maybe'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!friendRsvps || friendRsvps.length === 0) {
      return { data: [], total: 0, error: null };
    }

    const mutualEventIds = friendRsvps.map(r => r.event_id);

    // Get event details
    const { data: goldEvents } = await supabase
      .from('events_gold')
      .select('id, title, event_date, image_url, venue_id')
      .in('id', mutualEventIds);

    const foundGoldIds = new Set((goldEvents || []).map(e => e.id));
    const missingIds = mutualEventIds.filter(id => !foundGoldIds.has(id));

    let oldEvents: any[] = [];
    if (missingIds.length > 0) {
      const { data: archived } = await supabase
        .from('old_events')
        .select('id, title, event_date, image_url, venue_id')
        .in('id', missingIds);
      oldEvents = archived || [];
    }

    const allEvents = [...(goldEvents || []), ...oldEvents];
    const eventMap = new Map(allEvents.map(e => [e.id, e]));

    // Get venue names
    const venueIds = [...new Set(allEvents.map(e => e.venue_id).filter(Boolean))];
    let venueMap = new Map<string, string>();
    if (venueIds.length > 0) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds);
      venueMap = new Map((venues || []).map(v => [v.id, v.name]));
    }

    // Get friend profile
    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', friendUserId)
      .single();

    const today = new Date().toISOString().split('T')[0];

    const historyItems: UserEventHistoryItem[] = friendRsvps.map(rsvp => {
      const event = eventMap.get(rsvp.event_id);
      const eventDate = event?.event_date?.split('T')[0] || null;
      const isPast = eventDate ? eventDate < today : false;

      return {
        event_id: rsvp.event_id,
        event_title: event?.title || null,
        event_date: event?.event_date || null,
        event_image_url: event?.image_url || null,
        venue_name: event?.venue_id ? venueMap.get(event.venue_id) || null : null,
        venue_id: event?.venue_id || null,
        response: rsvp.response as 'yes' | 'no' | 'maybe',
        rsvp_date: rsvp.created_at,
        is_past: isPast,
        friends_attending: friendProfile ? [{
          user_id: friendProfile.id,
          username: friendProfile.username,
          full_name: friendProfile.full_name,
          avatar_url: friendProfile.avatar_url,
        }] : [],
      };
    });

    return { data: historyItems, total: count || historyItems.length, error: null };
  } catch (err) {
    logger.error('Error in getMutualEventsWithFriend:', err);
    return { data: [], total: 0, error: err };
  }
}

// ============================================
// Direct Friend Invitations
// ============================================

export interface DirectEventInvite {
  id: string;
  event_id: string;
  sender_id: string;
  recipient_id: string;
  message?: string | null;
  status: 'pending' | 'viewed' | 'accepted' | 'declined';
  allow_plus_one: boolean;
  created_at: string;
  updated_at: string;
}

export interface DirectInviteWithSender {
  invite_id: string;
  event_id: string;
  sender_id: string;
  sender_username?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
  message?: string | null;
  allow_plus_one: boolean;
  status: string;
  created_at: string;
}

export interface SendDirectInvitesParams {
  eventId: string;
  recipientIds: string[];
  message?: string;
  allowPlusOne?: boolean;
}

/**
 * Send direct event invites to multiple friends (batch)
 */
export async function sendDirectEventInvites(
  params: SendDirectInvitesParams
): Promise<{ data: DirectEventInvite[]; error: any }> {
  try {
    const { data, error } = await supabase.rpc('send_direct_event_invites', {
      p_event_id: params.eventId,
      p_recipient_ids: params.recipientIds,
      p_message: params.message || null,
      p_allow_plus_one: params.allowPlusOne ?? false,
    });

    if (error) {
      logger.error('Error sending direct invites:', error);
      return { data: [], error };
    }

    analytics.trackSocialMetric({
      actionType: 'direct_invite_sent',
      targetId: params.eventId,
      targetType: 'event',
      source: 'invite_modal',
      metadata: {
        recipientCount: params.recipientIds.length,
        hasMessage: !!params.message,
        allowPlusOne: params.allowPlusOne,
      },
    });

    return { data: (data || []) as DirectEventInvite[], error: null };
  } catch (err) {
    logger.error('Error in sendDirectEventInvites:', err);
    return { data: [], error: err };
  }
}

/**
 * Get IDs of friends already invited by the current user for an event
 */
export async function getAlreadyInvitedFriendIds(
  eventId: string
): Promise<{ data: string[]; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_already_invited_friends', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error getting already invited friends:', error);
      return { data: [], error };
    }

    return { data: (data || []) as string[], error: null };
  } catch (err) {
    logger.error('Error in getAlreadyInvitedFriendIds:', err);
    return { data: [], error: err };
  }
}

/**
 * Respond to a direct event invite (accept or decline)
 */
export async function respondToDirectInvite(
  inviteId: string,
  response: 'accepted' | 'declined'
): Promise<{ success: boolean; rsvpId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('respond_to_direct_invite', {
      p_invite_id: inviteId,
      p_response: response,
    });

    if (error) {
      logger.error('Error responding to direct invite:', error);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string; rsvp_id?: string };
    if (!result.success) {
      return { success: false, error: result.error };
    }

    analytics.trackSocialMetric({
      actionType: response === 'accepted' ? 'direct_invite_accepted' : 'direct_invite_declined',
      targetId: inviteId,
      targetType: 'direct_invite',
      source: 'my_invites',
    });

    return { success: true, rsvpId: result.rsvp_id };
  } catch (err: any) {
    logger.error('Error in respondToDirectInvite:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get direct invites received by the current user (all statuses)
 */
export async function getReceivedDirectInvites(): Promise<{
  data: DirectInviteWithSender[];
  error: any;
}> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('direct_event_invites')
      .select('id, event_id, sender_id, message, allow_plus_one, status, created_at')
      .eq('recipient_id', user.user.id)
      .in('status', ['pending', 'viewed'])
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error getting received direct invites:', error);
      return { data: [], error };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Get sender profiles
    const senderIds = [...new Set(data.map(d => d.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const invites: DirectInviteWithSender[] = data.map((inv: any) => {
      const profile = profileMap.get(inv.sender_id);
      return {
        invite_id: inv.id,
        event_id: inv.event_id,
        sender_id: inv.sender_id,
        sender_username: profile?.username || null,
        sender_name: profile?.full_name || null,
        sender_avatar: profile?.avatar_url || null,
        message: inv.message,
        allow_plus_one: inv.allow_plus_one,
        status: inv.status,
        created_at: inv.created_at,
      };
    });

    return { data: invites, error: null };
  } catch (err) {
    logger.error('Error in getReceivedDirectInvites:', err);
    return { data: [], error: err };
  }
}
