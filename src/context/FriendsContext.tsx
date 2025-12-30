// src/context/FriendsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, PropsWithChildren } from 'react';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import {
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  getFollowers,
  getFollowing,
  getSocialStats,
  FriendWithProfile,
  FriendRequest,
  FollowerRelation,
  SocialStats,
} from '../api/friends';

interface FriendsContextType {
  // Data
  friends: FriendWithProfile[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  followers: FollowerRelation[];
  following: FollowerRelation[];
  stats: SocialStats;
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  refreshFriends: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshFollowers: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const defaultStats: SocialStats = {
  friendCount: 0,
  followerCount: 0,
  followingCount: 0,
  pendingRequestsCount: 0,
};

const FriendsContext = createContext<FriendsContextType>({
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  followers: [],
  following: [],
  stats: defaultStats,
  isLoading: false,
  refreshFriends: async () => {},
  refreshRequests: async () => {},
  refreshFollowers: async () => {},
  refreshAll: async () => {},
});

export function FriendsProvider({ children }: PropsWithChildren) {
  const { isLoggedIn, session } = useAuth();

  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [followers, setFollowers] = useState<FollowerRelation[]>([]);
  const [following, setFollowing] = useState<FollowerRelation[]>([]);
  const [stats, setStats] = useState<SocialStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFriends = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const { data, error } = await getFriends();
      if (!error && data) {
        setFriends(data);
      }
    } catch (err) {
      logger.error('Error refreshing friends:', err);
    }
  }, [isLoggedIn]);

  const refreshRequests = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const [pendingResult, sentResult] = await Promise.all([
        getPendingFriendRequests(),
        getSentFriendRequests(),
      ]);
      
      if (!pendingResult.error && pendingResult.data) {
        setPendingRequests(pendingResult.data);
      }
      if (!sentResult.error && sentResult.data) {
        setSentRequests(sentResult.data);
      }
    } catch (err) {
      logger.error('Error refreshing requests:', err);
    }
  }, [isLoggedIn]);

  const refreshFollowers = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const [followersResult, followingResult] = await Promise.all([
        getFollowers(),
        getFollowing(),
      ]);
      
      if (!followersResult.error && followersResult.data) {
        setFollowers(followersResult.data);
      }
      if (!followingResult.error && followingResult.data) {
        setFollowing(followingResult.data);
      }
    } catch (err) {
      logger.error('Error refreshing followers:', err);
    }
  }, [isLoggedIn]);

  const refreshAll = useCallback(async () => {
    if (!isLoggedIn) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        refreshFriends(),
        refreshRequests(),
        refreshFollowers(),
      ]);
      
      // Also refresh stats
      const { data: statsData } = await getSocialStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      logger.error('Error refreshing all friends data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, refreshFriends, refreshRequests, refreshFollowers]);

  // Initial load when logged in
  useEffect(() => {
    if (isLoggedIn) {
      refreshAll();
    } else {
      // Clear data when logged out
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setFollowers([]);
      setFollowing([]);
      setStats(defaultStats);
    }
  }, [isLoggedIn, session?.user?.id]);

  // Update stats whenever data changes
  useEffect(() => {
    setStats({
      friendCount: friends.length,
      followerCount: followers.length,
      followingCount: following.length,
      pendingRequestsCount: pendingRequests.length,
    });
  }, [friends.length, followers.length, following.length, pendingRequests.length]);

  const contextValue = useMemo(
    () => ({
      friends,
      pendingRequests,
      sentRequests,
      followers,
      following,
      stats,
      isLoading,
      refreshFriends,
      refreshRequests,
      refreshFollowers,
      refreshAll,
    }),
    [
      friends,
      pendingRequests,
      sentRequests,
      followers,
      following,
      stats,
      isLoading,
      refreshFriends,
      refreshRequests,
      refreshFollowers,
      refreshAll,
    ]
  );

  return (
    <FriendsContext.Provider value={contextValue}>
      {children}
    </FriendsContext.Provider>
  );
}

export const useFriends = () => useContext(FriendsContext);
