import { useQuery } from '@tanstack/react-query';
import { getMyInvitationsForEvent, getDirectInvitesForEvent, EventInvitation } from '../../api/invitations';
import { supabase } from '../../supabase';
import { useAuth } from '../useAuth';
import { logger } from '../../utils/logger';

export interface EventInvitationsData {
  invitations: EventInvitation[];
  isEventHost: boolean;
  isCreator: boolean;
  totalGoing: number;
  totalMaybe: number;
  totalNo: number;
  totalResponses: number;
  directInviteCount: number;
  directInvitePendingCount: number;
  directInviteAcceptedCount: number;
  directInviteDeclinedCount: number;
}

export function useEventInvitationsQuery(eventId: string | undefined) {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['myEventInvitations', eventId, session?.user?.id],
    queryFn: async (): Promise<EventInvitationsData> => {
      if (!eventId) {
        return {
          invitations: [],
          isEventHost: false,
          isCreator: false,
          totalGoing: 0,
          totalMaybe: 0,
          totalNo: 0,
          totalResponses: 0,
          directInviteCount: 0,
          directInvitePendingCount: 0,
          directInviteAcceptedCount: 0,
          directInviteDeclinedCount: 0,
        };
      }

      const [invitationsResult, directInvitesResult] = await Promise.all([
        getMyInvitationsForEvent(eventId),
        getDirectInvitesForEvent(eventId),
      ]);

      const { data, stats, error } = invitationsResult;
      const hasInvitations = !error && data && data.length > 0;

      const directInvites = directInvitesResult.data || [];
      const hasDirectInvites = directInvites.length > 0;

      // Check if user is the creator of this event
      let isCreator = false;
      try {
        const { data: eventData } = await supabase
          .from('events_gold')
          .select('creator_id')
          .eq('id', eventId)
          .single();
        isCreator = eventData?.creator_id === session?.user?.id;
      } catch (err) {
        logger.warn('Could not check creator status:', err);
      }

      return {
        invitations: data || [],
        isEventHost: hasInvitations || hasDirectInvites || isCreator,
        isCreator,
        totalGoing: stats?.going || 0,
        totalMaybe: stats?.maybe || 0,
        totalNo: stats?.no || 0,
        totalResponses: stats?.total || 0,
        directInviteCount: directInvites.length,
        directInvitePendingCount: directInvites.filter(d => d.status === 'pending').length,
        directInviteAcceptedCount: directInvites.filter(d => d.status === 'accepted').length,
        directInviteDeclinedCount: directInvites.filter(d => d.status === 'declined').length,
      };
    },
    enabled: isLoggedIn && !!session?.user?.id && !!eventId,
  });
}
