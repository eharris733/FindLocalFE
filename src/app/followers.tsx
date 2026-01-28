// src/app/followers.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Text } from '../components/ui';
import {
  getFollowers,
  getFollowing,
  unfollowUser,
  followUser,
} from '../api/friends';
import { Profile } from '../api/profiles';
import { logger } from '../utils/logger';

type TabType = 'followers' | 'following';

interface FollowerItemProps {
  readonly profile: Profile;
  readonly isFollowing?: boolean;
  readonly onToggleFollow: (userId: string, currentlyFollowing: boolean) => Promise<void>;
  readonly onPress: (username: string) => void;
  readonly theme: any;
  readonly isOwnProfile?: boolean;
}

function FollowerItem({
  profile,
  isFollowing,
  onToggleFollow,
  onPress,
  theme,
  isOwnProfile,
}: FollowerItemProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    await onToggleFollow(profile.id, isFollowing || false);
    setLoading(false);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={[styles.followerItem, { backgroundColor: theme.colors.background.secondary }]}
      onPress={() => profile.username && onPress(profile.username)}
    >
      {/* Avatar */}
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary[500] }]}>
          <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
            {getInitials(profile.full_name)}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.followerInfo}>
        <Text variant="body1" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
          {profile.full_name || 'Anonymous'}
        </Text>
        {profile.username && (
          <Text variant="caption" color="secondary">
            @{profile.username}
          </Text>
        )}
        {profile.account_type === 'creator' && (
          <View style={[styles.creatorBadge, { backgroundColor: theme.colors.secondary[500] + '20' }]}>
            <Text variant="caption" style={{ color: theme.colors.secondary[500], fontWeight: '600' }}>
              Creator
            </Text>
          </View>
        )}
      </View>

      {/* Follow/Unfollow Button (only show if not own profile) */}
      {!isOwnProfile && (
        <TouchableOpacity
          style={[
            styles.followButton,
            {
              backgroundColor: isFollowing
                ? theme.colors.background.primary
                : theme.colors.primary[500],
              borderWidth: isFollowing ? 1 : 0,
              borderColor: theme.colors.primary[500],
            },
          ]}
          onPress={handleToggleFollow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary[500] : '#fff'} />
          ) : (
            <Text
              variant="caption"
              style={{
                color: isFollowing ? theme.colors.primary[500] : '#fff',
                fontWeight: '600',
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function FollowersPage() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { session, isLoggedIn } = useAuth();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'followers');
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (tab === 'followers' || tab === 'following') {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [followersResult, followingResult] = await Promise.all([
        getFollowers(user.id),
        getFollowing(),
      ]);

      // Extract profiles from follower relations
      const followerProfiles = (followersResult.data || []).map(r => r.follower).filter((p): p is Profile => !!p);
      const followingProfiles = (followingResult.data || []).map(r => r.following).filter((p): p is Profile => !!p);
      setFollowers(followerProfiles);
      setFollowing(followingProfiles);

      // Build a map of who the current user is following
      const followingIds = new Set(followingProfiles.map((p) => p.id));
      const map: Record<string, boolean> = {};
      
      // For followers tab, check if we're following each follower
      followerProfiles.forEach((follower) => {
        map[follower.id] = followingIds.has(follower.id);
      });
      
      // For following tab, all are being followed
      followingProfiles.forEach((followed) => {
        map[followed.id] = true;
      });

      setFollowingMap(map);
    } catch (error) {
      logger.error('Error loading followers/following:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleFollow = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await unfollowUser(userId);
        // Update following list if we unfollowed
        setFollowing((prev) => prev.filter((p) => p.id !== userId));
        setFollowingMap((prev) => ({ ...prev, [userId]: false }));
      } else {
        await followUser(userId);
        // Refresh following list since we added someone
        const result = await getFollowing();
        setFollowing(result.data?.map(r => r.following).filter((p): p is Profile => !!p) || []);
        setFollowingMap((prev) => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      logger.error('Error toggling follow:', error);
    }
  };

  const handleUserPress = (username: string) => {
    router.push(`/user/${username}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>
        {activeTab === 'followers' ? '👥' : '🔍'}
      </Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
        {activeTab === 'followers'
          ? 'Share your profile to get followers!'
          : 'Discover creators to follow and see their activity here.'}
      </Text>
      {activeTab === 'following' && (
        <TouchableOpacity
          style={[styles.discoverButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={() => router.push('/discover-creators')}
        >
          <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
            Discover Creators
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View>
      <Text variant="h3" style={{ marginBottom: 20 }}>Followers</Text>
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.background.secondary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'followers' && { backgroundColor: theme.colors.background.primary },
          ]}
          onPress={() => setActiveTab('followers')}
        >
          <Text
            variant="body2"
            style={{
              fontWeight: activeTab === 'followers' ? '700' : '400',
              color:
                activeTab === 'followers'
                  ? theme.colors.primary[500]
                  : theme.colors.text.secondary,
            }}
          >
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'following' && { backgroundColor: theme.colors.background.primary },
          ]}
          onPress={() => setActiveTab('following')}
        >
          <Text
            variant="body2"
            style={{
              fontWeight: activeTab === 'following' ? '700' : '400',
              color:
                activeTab === 'following'
                  ? theme.colors.primary[500]
                  : theme.colors.text.secondary,
            }}
          >
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.headerContainer}>
          <Text variant="h3" style={{ marginBottom: 20 }}>Followers</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
            Sign in to see your followers
          </Text>
          <TouchableOpacity
            style={[styles.discoverButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => router.push('/user/signin')}
          >
            <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.headerContainer}>
          <Text variant="h3" style={{ marginBottom: 20 }}>Followers</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </View>
    );
  }

  const currentList = activeTab === 'followers' ? followers : following;

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={currentList.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
      data={currentList}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <FollowerItem
          profile={item}
          isFollowing={followingMap[item.id]}
          onToggleFollow={handleToggleFollow}
          onPress={handleUserPress}
          theme={theme}
          isOwnProfile={item.id === user?.id}
        />
      )}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary[500]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    paddingTop: 60,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  emptyContentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: -60,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  creatorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  discoverButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
  },
});
