// src/app/user/[username].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/ui';
import { Profile, getProfileByUsername } from '../../api/profiles';
import {
  followUser,
  unfollowUser,
  checkFollowing,
  checkFriendship,
  sendFriendRequest,
  getFollowerCount,
  getFollowingCount,
  getFriendCount,
} from '../../api/friends';
import { logger } from '../../utils/logger';

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { isLoggedIn, session } = useAuth();
  const user = session?.user;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Relationship state
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Stats
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await getProfileByUsername(username || '');

      if (profileError || !data) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setProfile(data);

      // Check if this is the current user's own profile
      if (user && data.id === user.id) {
        setIsOwnProfile(true);
      } else {
        setIsOwnProfile(false);

        // Check relationship status
        if (isLoggedIn && user) {
          const [followingResult, friendResult] = await Promise.all([
            checkFollowing(data.id),
            checkFriendship(data.id),
          ]);
          setIsFollowing(followingResult.isFollowing);
          setIsFriend(friendResult.isFriend);
        }
      }

      // Load stats
      const [followers, following, friends] = await Promise.all([
        getFollowerCount(data.id),
        getFollowingCount(data.id),
        getFriendCount(data.id),
      ]);
      setFollowerCount(followers.count);
      setFollowingCount(following.count);
      setFriendCount(friends.count);
    } catch (err) {
      logger.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Use Expo Router's canGoBack() to check if there's a previous screen in the stack
    if (router.canGoBack()) {
      router.back();
    } else {
      // No previous screen in the app's navigation stack, go to home
      router.replace('/');
    }
  };

  const handleFollow = async () => {
    if (!profile || !isLoggedIn) return;

    setActionLoading(true);
    try {
      if (isFollowing) {
        const { success } = await unfollowUser(profile.id);
        if (success) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        const { success } = await followUser(profile.id);
        if (success) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      logger.error('Error following/unfollowing:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!profile || !isLoggedIn) return;

    setActionLoading(true);
    try {
      const { data, error } = await sendFriendRequest(profile.id);
      if (data) {
        // Request sent successfully
        alert('Friend request sent!');
      } else if (error) {
        alert(error.message || 'Could not send friend request');
      }
    } catch (err) {
      logger.error('Error sending friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/profile');
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text variant="body1" style={{ color: theme.colors.text.secondary, marginTop: 16 }}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>😔</Text>
          <Text variant="h3" style={{ color: theme.colors.text.primary, marginBottom: 8 }}>
            User Not Found
          </Text>
          <Text variant="body1" style={{ color: theme.colors.text.secondary, marginBottom: 24 }}>
            {error || "This profile doesn't exist or may have been removed."}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary[500] }]}
            onPress={handleBack}
          >
            <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCreator = profile.account_type === 'creator';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Profile
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.background.secondary }]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View
                style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary[500] }]}
              >
                <Text variant="h1" style={{ color: '#fff' }}>
                  {getInitials(profile.full_name)}
                </Text>
              </View>
            )}
            {isCreator && (
              <View style={[styles.creatorBadge, { backgroundColor: theme.colors.secondary[500] }]}>
                <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
                  CREATOR
                </Text>
              </View>
            )}
          </View>

          {/* Name & Username */}
          <Text variant="h2" style={{ color: theme.colors.text.primary, marginTop: 16 }}>
            {profile.full_name || 'Anonymous'}
          </Text>
          {profile.username && (
            <Text variant="body1" style={{ color: theme.colors.text.secondary, marginTop: 4 }}>
              @{profile.username}
            </Text>
          )}

          {/* Bio */}
          {profile.bio && (
            <Text
              variant="body1"
              style={{ color: theme.colors.text.secondary, marginTop: 12, textAlign: 'center' }}
            >
              {profile.bio}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            {isCreator ? (
              <>
                <View style={styles.statItem}>
                  <Text variant="h3" style={{ color: theme.colors.text.primary }}>
                    {followerCount}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                    Followers
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.border.light }]} />
                <View style={styles.statItem}>
                  <Text variant="h3" style={{ color: theme.colors.text.primary }}>
                    {followingCount}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                    Following
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text variant="h3" style={{ color: theme.colors.text.primary }}>
                    {friendCount}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                    Friends
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.border.light }]} />
                <View style={styles.statItem}>
                  <Text variant="h3" style={{ color: theme.colors.text.primary }}>
                    {followingCount}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                    Following
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={handleEditProfile}
              >
                <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            ) : isLoggedIn ? (
              <>
                {/* Follow Button (for creators) */}
                {isCreator && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: isFollowing
                          ? theme.colors.background.primary
                          : theme.colors.primary[500],
                        borderWidth: isFollowing ? 2 : 0,
                        borderColor: theme.colors.primary[500],
                      },
                    ]}
                    onPress={handleFollow}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary[500] : '#fff'} />
                    ) : (
                      <Text
                        variant="body1"
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

                {/* Add Friend Button (for personal accounts) */}
                {!isCreator && !isFriend && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
                    onPress={handleAddFriend}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
                        Add Friend
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Already Friends indicator */}
                {!isCreator && isFriend && (
                  <View
                    style={[
                      styles.friendBadge,
                      { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success },
                    ]}
                  >
                    <Text variant="body2" style={{ color: theme.colors.success, fontWeight: '600' }}>
                      ✓ Friends
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={() => router.push('/user/signin')}
              >
                <Text variant="body1" style={{ color: '#fff', fontWeight: '600' }}>
                  Sign in to Connect
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Activity Section - Placeholder */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.secondary }]}>
          <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 16 }}>
            Recent Activity
          </Text>
          <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
            {profile.activity_visibility === 'none'
              ? 'This user has hidden their activity'
              : 'No recent activity to show'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorBadge: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  friendBadge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 2,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
});
