// src/app/discover-creators.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { Text } from '../components/ui';
import PageView from '../components/ui/PageView';
import { Profile } from '../api/profiles';
import { followUser, unfollowUser, getFollowing, getFollowerCount } from '../api/friends';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

interface CreatorWithStats extends Profile {
  follower_count?: number;
}

interface CreatorItemProps {
  readonly creator: CreatorWithStats;
  readonly isFollowing: boolean;
  readonly onToggleFollow: (creatorId: string, currentlyFollowing: boolean) => Promise<void>;
  readonly onPress: (username: string) => void;
  readonly theme: any;
}

function CreatorItem({ creator, isFollowing, onToggleFollow, onPress, theme }: CreatorItemProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    await onToggleFollow(creator.id, isFollowing);
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
      style={[styles.creatorCard, { backgroundColor: theme.colors.background.secondary }]}
      onPress={() => creator.username && onPress(creator.username)}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary[500] }]}>
            <Text variant="h3" style={{ color: '#fff' }}>
              {getInitials(creator.full_name)}
            </Text>
          </View>
        )}
        <View style={[styles.creatorBadge, { backgroundColor: theme.colors.secondary[500] }]}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>CREATOR</Text>
        </View>
      </View>

      {/* Info */}
      <Text variant="body1" style={{ fontWeight: '600', color: theme.colors.text.primary, marginTop: 12 }}>
        {creator.full_name || 'Anonymous'}
      </Text>
      {creator.username && (
        <Text variant="caption" color="secondary">
          @{creator.username}
        </Text>
      )}

      {/* Bio preview */}
      {creator.bio && (
        <Text
          variant="caption"
          color="secondary"
          numberOfLines={2}
          style={{ marginTop: 8, textAlign: 'center' }}
        >
          {creator.bio}
        </Text>
      )}

      {/* Follower count */}
      <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginTop: 8 }}>
        {creator.follower_count || 0} followers
      </Text>

      {/* Follow Button */}
      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing
              ? theme.colors.background.primary
              : theme.colors.primary[500],
            borderWidth: isFollowing ? 2 : 0,
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
            variant="body2"
            style={{
              color: isFollowing ? theme.colors.primary[500] : '#fff',
              fontWeight: '600',
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function DiscoverCreatorsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { session, isLoggedIn } = useAuth();
  const user = session?.user;

  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    if (isLoggedIn && user) {
      loadFollowingStatus();
    }
  }, [isLoggedIn, user]);

  const loadCreators = async () => {
    setLoading(true);
    try {
      // Fetch all creator accounts
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'creator')
        .not('username', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching creators:', error);
        return;
      }

      // Fetch follower counts for each creator
      const creatorsWithStats: CreatorWithStats[] = await Promise.all(
        (data || []).map(async (creator) => {
          const { count } = await getFollowerCount(creator.id);
          return { ...creator, follower_count: count };
        })
      );

      // Sort by follower count (popular first)
      creatorsWithStats.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));

      setCreators(creatorsWithStats);
    } catch (error) {
      logger.error('Error loading creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowingStatus = async () => {
    if (!user) return;

    try {
      const { data } = await getFollowing();
      const map: Record<string, boolean> = {};
      (data || []).forEach((relation) => {
        if (relation.following) {
          map[relation.following.id] = true;
        }
      });
      setFollowingMap(map);
    } catch (error) {
      logger.error('Error loading following status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCreators(), loadFollowingStatus()]);
    setRefreshing(false);
  };

  const handleToggleFollow = async (creatorId: string, currentlyFollowing: boolean) => {
    if (!isLoggedIn) {
      router.push('/user/signin');
      return;
    }

    try {
      if (currentlyFollowing) {
        await unfollowUser(creatorId);
        setFollowingMap((prev) => ({ ...prev, [creatorId]: false }));
        // Update follower count locally
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creatorId ? { ...c, follower_count: Math.max(0, (c.follower_count || 1) - 1) } : c
          )
        );
      } else {
        await followUser(creatorId);
        setFollowingMap((prev) => ({ ...prev, [creatorId]: true }));
        // Update follower count locally
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creatorId ? { ...c, follower_count: (c.follower_count || 0) + 1 } : c
          )
        );
      }
    } catch (error) {
      logger.error('Error toggling follow:', error);
    }
  };

  const handleCreatorPress = (username: string) => {
    router.push(`/user/${username}`);
  };

  // Filter creators based on search
  const filteredCreators = searchQuery
    ? creators.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : creators;

  // Exclude current user from the list
  const displayCreators = filteredCreators.filter((c) => c.id !== user?.id);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🔍</Text>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
        {searchQuery ? 'No creators found' : 'No creators yet'}
      </Text>
      <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
        {searchQuery
          ? 'Try a different search term'
          : 'Be the first to become a creator! Switch to Creator mode in your profile settings.'}
      </Text>
    </View>
  );

  return (
    <PageView title="Discover Creators">
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.background.secondary }]}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search creators..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={{ color: theme.colors.text.tertiary }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Creators Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body2" color="secondary" style={{ marginTop: 12 }}>
            Loading creators...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayCreators}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <CreatorItem
              creator={item}
              isFollowing={followingMap[item.id] || false}
              onToggleFollow={handleToggleFollow}
              onPress={handleCreatorPress}
              theme={theme}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={displayCreators.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[500]}
            />
          }
        />
      )}
    </PageView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  creatorCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  followButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 12,
    minWidth: 100,
    alignItems: 'center',
  },
});
