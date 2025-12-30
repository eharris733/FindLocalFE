// src/api/friends.ts
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { Profile } from './profiles';

// ============================================
// Types
// ============================================

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  requester?: Profile;
  recipient?: Profile;
}

export interface Friendship {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
  // The friend's profile (from either user_id_1 or user_id_2)
  friend?: Profile;
}

export interface FollowerRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  // Joined profile data
  follower?: Profile;
  following?: Profile;
}

export interface FriendWithProfile {
  friendship_id: string;
  friend_id: string;
  created_at: string;
  profile: Profile;
}

// ============================================
// Friend Requests
// ============================================

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(
  recipientId: string,
  message?: string
): Promise<{ data: FriendRequest | null; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    // Check if already friends
    const { data: areFriends } = await supabase.rpc('are_friends', {
      user_a: user.user.id,
      user_b: recipientId,
    });

    if (areFriends) {
      return { data: null, error: { message: 'Already friends with this user' } };
    }

    // Check if there's already a pending request (in either direction)
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(requester_id.eq.${user.user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.user.id})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return { data: null, error: { message: 'A friend request already exists between you and this user' } };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        requester_id: user.user.id,
        recipient_id: recipientId,
        message,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error sending friend request:', error);
      return { data: null, error };
    }

    return { data: data as FriendRequest, error: null };
  } catch (err) {
    logger.error('Error in sendFriendRequest:', err);
    return { data: null, error: err };
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase.rpc('accept_friend_request', {
      request_id: requestId,
    });

    if (error) {
      logger.error('Error accepting friend request:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in acceptFriendRequest:', err);
    return { success: false, error: err };
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase.rpc('reject_friend_request', {
      request_id: requestId,
    });

    if (error) {
      logger.error('Error rejecting friend request:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in rejectFriendRequest:', err);
    return { success: false, error: err };
  }
}

/**
 * Cancel a friend request you sent
 */
export async function cancelFriendRequest(requestId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      logger.error('Error canceling friend request:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in cancelFriendRequest:', err);
    return { success: false, error: err };
  }
}

/**
 * Get pending friend requests received by the current user
 */
export async function getPendingFriendRequests(): Promise<{ data: FriendRequest[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    // First get the friend requests
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('recipient_id', user.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      logger.error('Error fetching pending friend requests:', requestsError);
      return { data: [], error: requestsError };
    }

    if (!requests || requests.length === 0) {
      return { data: [], error: null };
    }

    // Get requester profiles separately
    const requesterIds = requests.map(r => r.requester_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .in('id', requesterIds);

    if (profilesError) {
      logger.error('Error fetching requester profiles:', profilesError);
      return { data: [], error: profilesError };
    }

    // Combine data
    const data = requests.map(r => ({
      ...r,
      requester: profiles?.find(p => p.id === r.requester_id),
    }));

    return { data: data as FriendRequest[], error: null };
  } catch (err) {
    logger.error('Error in getPendingFriendRequests:', err);
    return { data: [], error: err };
  }
}

/**
 * Get friend requests sent by the current user
 */
export async function getSentFriendRequests(): Promise<{ data: FriendRequest[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    // First get the friend requests
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('requester_id', user.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      logger.error('Error fetching sent friend requests:', requestsError);
      return { data: [], error: requestsError };
    }

    if (!requests || requests.length === 0) {
      return { data: [], error: null };
    }

    // Get recipient profiles separately
    const recipientIds = requests.map(r => r.recipient_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .in('id', recipientIds);

    if (profilesError) {
      logger.error('Error fetching recipient profiles:', profilesError);
      return { data: [], error: profilesError };
    }

    // Combine data
    const data = requests.map(r => ({
      ...r,
      recipient: profiles?.find(p => p.id === r.recipient_id),
    }));

    return { data: data as FriendRequest[], error: null };
  } catch (err) {
    logger.error('Error in getSentFriendRequests:', err);
    return { data: [], error: err };
  }
}

// ============================================
// Friendships
// ============================================

/**
 * Get all friends of the current user
 */
export async function getFriends(): Promise<{ data: FriendWithProfile[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    const userId = user.user.id;

    // Get all friendships where user is either user_id_1 or user_id_2
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching friendships:', error);
      return { data: [], error };
    }

    if (!friendships || friendships.length === 0) {
      return { data: [], error: null };
    }

    // Get friend IDs (the other user in each friendship)
    const friendIds = friendships.map((f) =>
      f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
    );

    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .in('id', friendIds);

    if (profileError) {
      logger.error('Error fetching friend profiles:', profileError);
      return { data: [], error: profileError };
    }

    // Map friendships to include profile data
    const friendsWithProfiles: FriendWithProfile[] = friendships.map((f) => {
      const friendId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
      const profile = profiles?.find((p) => p.id === friendId);
      return {
        friendship_id: f.id,
        friend_id: friendId,
        created_at: f.created_at,
        profile: profile as Profile,
      };
    });

    return { data: friendsWithProfiles, error: null };
  } catch (err) {
    logger.error('Error in getFriends:', err);
    return { data: [], error: err };
  }
}

/**
 * Remove a friend (unfriend)
 */
export async function removeFriend(friendshipId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      logger.error('Error removing friend:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in removeFriend:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if current user is friends with another user
 */
export async function checkFriendship(otherUserId: string): Promise<{ isFriend: boolean; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { isFriend: false, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase.rpc('are_friends', {
      user_a: user.user.id,
      user_b: otherUserId,
    });

    if (error) {
      logger.error('Error checking friendship:', error);
      return { isFriend: false, error };
    }

    return { isFriend: data as boolean, error: null };
  } catch (err) {
    logger.error('Error in checkFriendship:', err);
    return { isFriend: false, error: err };
  }
}

/**
 * Get friend count for a user
 */
export async function getFriendCount(userId?: string): Promise<{ count: number; error: any }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { count: 0, error: { message: 'Not authenticated' } };
      }
      targetUserId = user.user.id;
    }

    const { data, error } = await supabase.rpc('get_friend_count', {
      user_id: targetUserId,
    });

    if (error) {
      logger.error('Error getting friend count:', error);
      return { count: 0, error };
    }

    return { count: data as number, error: null };
  } catch (err) {
    logger.error('Error in getFriendCount:', err);
    return { count: 0, error: err };
  }
}

// ============================================
// Followers (for Creator accounts)
// ============================================

/**
 * Follow a creator account
 */
export async function followUser(userIdToFollow: string): Promise<{ success: boolean; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: user.user.id,
        following_id: userIdToFollow,
      });

    if (error) {
      logger.error('Error following user:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in followUser:', err);
    return { success: false, error: err };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userIdToUnfollow: string): Promise<{ success: boolean; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', user.user.id)
      .eq('following_id', userIdToUnfollow);

    if (error) {
      logger.error('Error unfollowing user:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in unfollowUser:', err);
    return { success: false, error: err };
  }
}

/**
 * Get users that the current user is following
 */
export async function getFollowing(): Promise<{ data: FollowerRelation[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    // First get the follower relations
    const { data: relations, error: relationsError } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', user.user.id)
      .order('created_at', { ascending: false });

    if (relationsError) {
      logger.error('Error fetching following:', relationsError);
      return { data: [], error: relationsError };
    }

    if (!relations || relations.length === 0) {
      return { data: [], error: null };
    }

    // Get following profiles separately
    const followingIds = relations.map(r => r.following_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .in('id', followingIds);

    if (profilesError) {
      logger.error('Error fetching following profiles:', profilesError);
      return { data: [], error: profilesError };
    }

    // Combine data
    const data = relations.map(r => ({
      ...r,
      following: profiles?.find(p => p.id === r.following_id),
    }));

    return { data: data as FollowerRelation[], error: null };
  } catch (err) {
    logger.error('Error in getFollowing:', err);
    return { data: [], error: err };
  }
}

/**
 * Get followers of a user
 */
export async function getFollowers(userId?: string): Promise<{ data: FollowerRelation[]; error: any }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { data: [], error: { message: 'Not authenticated' } };
      }
      targetUserId = user.user.id;
    }

    // First get the follower relations
    const { data: relations, error: relationsError } = await supabase
      .from('followers')
      .select('*')
      .eq('following_id', targetUserId)
      .order('created_at', { ascending: false });

    if (relationsError) {
      logger.error('Error fetching followers:', relationsError);
      return { data: [], error: relationsError };
    }

    if (!relations || relations.length === 0) {
      return { data: [], error: null };
    }

    // Get follower profiles separately
    const followerIds = relations.map(r => r.follower_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .in('id', followerIds);

    if (profilesError) {
      logger.error('Error fetching follower profiles:', profilesError);
      return { data: [], error: profilesError };
    }

    // Combine data
    const data = relations.map(r => ({
      ...r,
      follower: profiles?.find(p => p.id === r.follower_id),
    }));

    return { data: data as FollowerRelation[], error: null };
  } catch (err) {
    logger.error('Error in getFollowers:', err);
    return { data: [], error: err };
  }
}

/**
 * Check if current user is following another user
 */
export async function checkFollowing(otherUserId: string): Promise<{ isFollowing: boolean; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { isFollowing: false, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.user.id)
      .eq('following_id', otherUserId)
      .maybeSingle();

    if (error) {
      logger.error('Error checking following:', error);
      return { isFollowing: false, error };
    }

    return { isFollowing: data !== null, error: null };
  } catch (err) {
    logger.error('Error in checkFollowing:', err);
    return { isFollowing: false, error: err };
  }
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(userId?: string): Promise<{ count: number; error: any }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { count: 0, error: { message: 'Not authenticated' } };
      }
      targetUserId = user.user.id;
    }

    const { data, error } = await supabase.rpc('get_follower_count', {
      user_id: targetUserId,
    });

    if (error) {
      logger.error('Error getting follower count:', error);
      return { count: 0, error };
    }

    return { count: data as number, error: null };
  } catch (err) {
    logger.error('Error in getFollowerCount:', err);
    return { count: 0, error: err };
  }
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId?: string): Promise<{ count: number; error: any }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { count: 0, error: { message: 'Not authenticated' } };
      }
      targetUserId = user.user.id;
    }

    const { data, error } = await supabase.rpc('get_following_count', {
      user_id: targetUserId,
    });

    if (error) {
      logger.error('Error getting following count:', error);
      return { count: 0, error };
    }

    return { count: data as number, error: null };
  } catch (err) {
    logger.error('Error in getFollowingCount:', err);
    return { count: 0, error: err };
  }
}

// ============================================
// Combined Social Stats
// ============================================

export interface SocialStats {
  friendCount: number;
  followerCount: number;
  followingCount: number;
  pendingRequestsCount: number;
}

/**
 * Get all social stats for a user
 */
export async function getSocialStats(userId?: string): Promise<{ data: SocialStats; error: any }> {
  try {
    const [friendResult, followerResult, followingResult, pendingResult] = await Promise.all([
      getFriendCount(userId),
      getFollowerCount(userId),
      getFollowingCount(userId),
      userId ? Promise.resolve({ data: [], error: null }) : getPendingFriendRequests(),
    ]);

    return {
      data: {
        friendCount: friendResult.count,
        followerCount: followerResult.count,
        followingCount: followingResult.count,
        pendingRequestsCount: Array.isArray(pendingResult.data) ? pendingResult.data.length : 0,
      },
      error: friendResult.error || followerResult.error || followingResult.error || pendingResult.error,
    };
  } catch (err) {
    logger.error('Error in getSocialStats:', err);
    return {
      data: { friendCount: 0, followerCount: 0, followingCount: 0, pendingRequestsCount: 0 },
      error: err,
    };
  }
}

// ============================================
// Friend Suggestions
// ============================================

/**
 * Get friend suggestions based on mutual friends and activity
 */
export async function getFriendSuggestions(limit: number = 10): Promise<{ data: Profile[]; error: any }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    // Get current friends
    const { data: friends } = await getFriends();
    const friendIds = friends?.map((f) => f.friend_id) || [];

    // Get users who are friends with your friends (mutual connections)
    // For now, we'll do a simpler approach: get users from the same city
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_city')
      .eq('id', user.user.id)
      .single();

    if (!profile?.preferred_city) {
      return { data: [], error: null };
    }

    // Get users from the same city who are not already friends
    const excludeIds = [user.user.id, ...friendIds];
    const { data: suggestions, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, account_type, bio')
      .eq('preferred_city', profile.preferred_city)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .not('username', 'is', null)
      .limit(limit);

    if (error) {
      logger.error('Error fetching friend suggestions:', error);
      return { data: [], error };
    }

    return { data: suggestions as Profile[], error: null };
  } catch (err) {
    logger.error('Error in getFriendSuggestions:', err);
    return { data: [], error: err };
  }
}
