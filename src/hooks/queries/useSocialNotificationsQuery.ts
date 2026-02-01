import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import { useAuth } from '../useAuth';
import { logger } from '../../utils/logger';

interface SocialNotifications {
  pendingFriendRequests: number;
  pendingInvitations: number;
  newFollowers: number;
  total: number;
}

async function getSocialNotifications(userId: string): Promise<SocialNotifications> {
  try {
    // Get pending friend requests (where current user is the target)
    const { count: friendRequestCount } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', userId)
      .eq('status', 'pending');

    // For now, pending invitations and followers are set to 0
    // These would require additional tables/fields in the backend
    const pendingInvitations = 0;
    const newFollowers = 0;

    const total = (friendRequestCount || 0) + pendingInvitations + newFollowers;

    return {
      pendingFriendRequests: friendRequestCount || 0,
      pendingInvitations,
      newFollowers,
      total,
    };
  } catch (err) {
    logger.error('Error getting social notifications:', err);
    return {
      pendingFriendRequests: 0,
      pendingInvitations: 0,
      newFollowers: 0,
      total: 0,
    };
  }
}

export function useSocialNotificationsQuery() {
  const { isLoggedIn, session } = useAuth();

  return useQuery({
    queryKey: ['socialNotifications', session?.user?.id],
    queryFn: () => getSocialNotifications(session?.user?.id!),
    enabled: isLoggedIn && !!session?.user?.id,
    staleTime: 1000 * 60, // 1 minute
  });
}
