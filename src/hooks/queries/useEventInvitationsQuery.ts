import { useQuery } from '@tanstack/react-query';
import { getMyInvitationsForEvent, EventInvitation } from '../../api/invitations';
import { useAuth } from '../useAuth';

export interface EventInvitationsData {
  invitations: EventInvitation[];
  isEventHost: boolean;
  totalGoing: number;
  totalMaybe: number;
  totalNo: number;
  totalResponses: number;
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
          totalGoing: 0,
          totalMaybe: 0,
          totalNo: 0,
          totalResponses: 0,
        };
      }

      const { data, stats, error } = await getMyInvitationsForEvent(eventId);

      if (error || !data || data.length === 0) {
        return {
          invitations: [],
          isEventHost: false,
          totalGoing: 0,
          totalMaybe: 0,
          totalNo: 0,
          totalResponses: 0,
        };
      }

      return {
        invitations: data,
        isEventHost: true,
        totalGoing: stats?.going || 0,
        totalMaybe: stats?.maybe || 0,
        totalNo: stats?.no || 0,
        totalResponses: stats?.total || 0,
      };
    },
    enabled: isLoggedIn && !!session?.user?.id && !!eventId,
  });
}
