import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Text, Button, Card } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { supabase } from '../supabase';
import {
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendSuggestions,
  sendFriendRequest,
  FriendWithProfile,
  FriendRequest,
} from '../api/friends';
import { searchProfiles, Profile } from '../api/profiles';
import { getMutualEventsWithFriend, UserEventHistoryItem } from '../api/invitations';

type TabType = 'connections' | 'requests' | 'suggestions';

// Avatar component for displaying user profile pictures
function UserAvatar({ 
  user, 
  size = 40,
  showOnlineIndicator = false,
}: { 
  user: Profile; 
  size?: number;
  showOnlineIndicator?: boolean;
}) {
  const { theme } = useTheme();
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.username?.[0]?.toUpperCase() || '?';

  // Generate a consistent color based on user id
  const colorIndex = user.id ? user.id.charCodeAt(0) % 5 : 0;
  const avatarColors = [
    theme.colors.primary[500],
    theme.colors.secondary[500],
    theme.colors.accent[500],
    '#6366F1', // indigo
    '#8B5CF6', // purple
  ];

  return (
    <View style={{ position: 'relative' }}>
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColors[colorIndex],
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            variant="body2"
            style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: size * 0.4,
            }}
          >
            {initials}
          </Text>
        </View>
      )}
      {showOnlineIndicator && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.colors.success,
            borderWidth: 2,
            borderColor: theme.colors.background.primary,
          }}
        />
      )}
    </View>
  );
}

// Connection item component
function ConnectionItem({
  friend,
  onRemove,
  onViewEvents,
}: {
  friend: FriendWithProfile;
  onRemove: (id: string) => void;
  onViewEvents?: (userId: string) => void;
}) {
  const { theme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const isCreator = friend.profile?.account_type === 'creator';

  return (
    <View
      style={[
        styles.connectionItem,
        { borderBottomColor: theme.colors.border.light },
      ]}
    >
      <View style={styles.connectionLeft}>
        <UserAvatar user={friend.profile} size={44} showOnlineIndicator />
        <View style={styles.connectionInfo}>
          <View style={styles.connectionNameRow}>
            <Text variant="body1" style={{ fontWeight: '600' }}>
              {friend.profile?.full_name || friend.profile?.username || 'Unknown'}
            </Text>
            {isCreator && (
              <View
                style={[
                  styles.creatorBadge,
                  { backgroundColor: theme.colors.secondary[500] + '20' },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: theme.colors.secondary[500], fontSize: 10 }}
                >
                  🎭
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" color="secondary">
            @{friend.profile?.username || 'username'}
          </Text>
        </View>
      </View>

      <View style={styles.connectionActions}>
        {onViewEvents && (
          <TouchableOpacity
            style={[
              styles.eventsButton,
              { backgroundColor: theme.colors.secondary[500] + '20' },
            ]}
            onPress={() => onViewEvents(friend.friend_id)}
          >
            <Text variant="caption" style={{ fontWeight: '500', color: theme.colors.secondary[600] }}>
              Mutual Events
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowMenu(!showMenu)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text variant="body1" color="tertiary">
            •••
          </Text>
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View
          style={[
            styles.menuDropdown,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.light,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onRemove(friend.friendship_id);
            }}
          >
            <Text variant="body2" color="error">
              Remove Friend
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Request item component
function RequestItem({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
}: {
  request: FriendRequest;
  type: 'received' | 'sent';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const { theme } = useTheme();
  const profile = type === 'received' ? request.requester : request.recipient;
  
  // Find mutual friends (placeholder - would need backend support)
  const mutualFriendText = 'New connection';

  return (
    <View
      style={[
        styles.requestItem,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <UserAvatar user={profile as Profile} size={40} />
      <View style={styles.requestInfo}>
        <Text variant="body1" style={{ fontWeight: '600' }}>
          {profile?.full_name || profile?.username || 'Unknown'}
        </Text>
        <Text variant="caption" color="secondary">
          {mutualFriendText}
        </Text>
      </View>

      {type === 'received' ? (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.rejectButton, { borderColor: theme.colors.border.medium }]}
            onPress={() => onReject?.(request.id)}
          >
            <Text variant="body2" color="secondary">
              ✕
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: theme.colors.secondary[500] },
            ]}
            onPress={() => onAccept?.(request.id)}
          >
            <Text variant="body2" style={{ color: '#FFFFFF' }}>
              ✓
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border.medium }]}
          onPress={() => onCancel?.(request.id)}
        >
          <Text variant="caption" color="secondary">
            Cancel
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Suggestion item component
function SuggestionItem({
  profile,
  onAdd,
  isLoading,
}: {
  profile: Profile;
  onAdd: (userId: string) => void;
  isLoading?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.suggestionItem,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <UserAvatar user={profile} size={44} />
      <View style={styles.suggestionInfo}>
        <Text variant="body1" style={{ fontWeight: '600' }}>
          {profile?.full_name || profile?.username || 'Unknown'}
        </Text>
        <Text variant="caption" color="secondary">
          @{profile?.username}
        </Text>
        {profile.bio && (
          <Text
            variant="caption"
            color="tertiary"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {profile.bio}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          { backgroundColor: theme.colors.primary[500] },
          isLoading && { opacity: 0.6 },
        ]}
        onPress={() => onAdd(profile.id)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text variant="body2" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            + Add
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function FriendsRoute() {
  const { theme } = useTheme();
  const { isLoggedIn, profile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  // Mutual events modal state
  const [showMutualEventsModal, setShowMutualEventsModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendWithProfile | null>(null);
  const [mutualEvents, setMutualEvents] = useState<UserEventHistoryItem[]>([]);
  const [loadingMutualEvents, setLoadingMutualEvents] = useState(false);
  const [mutualEventsError, setMutualEventsError] = useState<string | null>(null);

  // Fetch data on mount and when tab changes
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);

      const [friendsResult, pendingResult, sentResult, suggestionsResult] =
        await Promise.all([
          getFriends(),
          getPendingFriendRequests(),
          getSentFriendRequests(),
          getFriendSuggestions(),
        ]);

      if (friendsResult.data) setFriends(friendsResult.data);
      if (pendingResult.data) setPendingRequests(pendingResult.data);
      if (sentResult.data) setSentRequests(sentResult.data);
      if (suggestionsResult.data) setSuggestions(suggestionsResult.data);
    } catch (error) {
      logger.error('Error fetching friends data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle search
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const { data } = await searchProfiles(searchQuery);
        // Filter out current user and existing friends
        const friendIds = friends.map((f) => f.friend_id);
        const filtered = data.filter(
          (p) => p.id !== profile?.id && !friendIds.includes(p.id)
        );
        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, friends, profile?.id]);

  // Action handlers
  const handleAcceptRequest = async (requestId: string) => {
    setLoadingActions((prev) => ({ ...prev, [requestId]: true }));
    const { success } = await acceptFriendRequest(requestId);
    if (success) {
      await fetchData();
    }
    setLoadingActions((prev) => ({ ...prev, [requestId]: false }));
  };

  const handleRejectRequest = async (requestId: string) => {
    setLoadingActions((prev) => ({ ...prev, [requestId]: true }));
    const { success } = await rejectFriendRequest(requestId);
    if (success) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setLoadingActions((prev) => ({ ...prev, [requestId]: false }));
  };

  const handleCancelRequest = async (requestId: string) => {
    setLoadingActions((prev) => ({ ...prev, [requestId]: true }));
    const { success } = await cancelFriendRequest(requestId);
    if (success) {
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setLoadingActions((prev) => ({ ...prev, [requestId]: false }));
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    setLoadingActions((prev) => ({ ...prev, [friendshipId]: true }));
    const { success } = await removeFriend(friendshipId);
    if (success) {
      setFriends((prev) => prev.filter((f) => f.friendship_id !== friendshipId));
    }
    setLoadingActions((prev) => ({ ...prev, [friendshipId]: false }));
  };

  const handleAddFriend = async (userId: string) => {
    setLoadingActions((prev) => ({ ...prev, [userId]: true }));
    const { data } = await sendFriendRequest(userId);
    if (data) {
      // Remove from suggestions and search results
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
      setSearchResults((prev) => prev.filter((s) => s.id !== userId));
      // Add to sent requests list
      setSentRequests((prev) => [...prev, data]);
    }
    setLoadingActions((prev) => ({ ...prev, [userId]: false }));
  };

  // Handle viewing mutual events with a friend
  const handleViewMutualEvents = async (friend: FriendWithProfile) => {
    setSelectedFriend(friend);
    setShowMutualEventsModal(true);
    setLoadingMutualEvents(true);
    setMutualEventsError(null);

    try {
      const result = await getMutualEventsWithFriend(friend.friend_id);
      if (result.error) {
        setMutualEventsError('Failed to load mutual events');
        logger.error('Error fetching mutual events:', result.error);
      } else {
        setMutualEvents(result.data);
      }
    } catch (error) {
      setMutualEventsError('Failed to load mutual events');
      logger.error('Error fetching mutual events:', error);
    } finally {
      setLoadingMutualEvents(false);
    }
  };

  const handleShareLink = async () => {
    // Get current user's profile to share
    const { data: user } = await supabase.auth.getUser();
    
    // Create share URL - if user has a username, use that, otherwise use generic site
    let shareUrl = 'https://findlocal.community';
    let message = 'Join me on FindLocal!';
    
    if (user?.user) {
      // Try to get username from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.user.id)
        .single();
      
      if (profile?.username) {
        shareUrl = `https://findlocal.community/user/${profile.username}`;
        message = `Connect with me on FindLocal! ${shareUrl}`;
      }
    }

    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: 'Join FindLocal',
          text: message,
          url: shareUrl,
        });
      } else if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } else {
        await Share.share({ message, url: shareUrl });
      }
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  // Filter friends based on search
  const filteredFriends = searchQuery
    ? friends.filter(
        (f) =>
          f.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  // Not logged in state
  if (!isLoggedIn) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.notLoggedIn}>
          <Text variant="h2" style={{ textAlign: 'center', marginBottom: 16 }}>
            Connect with Friends
          </Text>
          <Text
            variant="body1"
            color="secondary"
            style={{ textAlign: 'center', marginBottom: 24 }}
          >
            Sign in to add friends, see who's going to events, and coordinate plans.
          </Text>
          <Button title="Sign In" variant="primary" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.light,
            },
          ]}
        >
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Search friends or username..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text color="tertiary">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'connections' && {
              borderBottomColor: theme.colors.primary[500],
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('connections')}
        >
          <Text
            variant="body1"
            style={{
              fontWeight: activeTab === 'connections' ? '600' : '400',
              color:
                activeTab === 'connections'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            }}
          >
            Connections
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'requests' && {
              borderBottomColor: theme.colors.primary[500],
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabWithBadge}>
            <Text
              variant="body1"
              style={{
                fontWeight: activeTab === 'requests' ? '600' : '400',
                color:
                  activeTab === 'requests'
                    ? theme.colors.text.primary
                    : theme.colors.text.tertiary,
              }}
            >
              Requests
            </Text>
            {pendingRequests.length > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.secondary[500] },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}
                >
                  {pendingRequests.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'suggestions' && {
              borderBottomColor: theme.colors.primary[500],
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text
            variant="body1"
            style={{
              fontWeight: activeTab === 'suggestions' ? '600' : '400',
              color:
                activeTab === 'suggestions'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            }}
          >
            Suggestions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Grow Your Circle Card */}
        <Card
          variant="filled"
          style={[
            styles.growCard,
            { backgroundColor: theme.colors.background.secondary },
          ]}
        >
          <View style={styles.growCardContent}>
            <View style={styles.growCardText}>
              <Text variant="h4" style={{ marginBottom: 4 }}>
                Grow your circle
              </Text>
              <Text variant="body2" color="secondary">
                Invite friends to coordinate plans and see what's happening.
              </Text>
            </View>
            <View
              style={[
                styles.growCardIcon,
                { backgroundColor: theme.colors.secondary[500] + '20' },
              ]}
            >
              <Text style={{ fontSize: 24 }}>👥</Text>
            </View>
          </View>

          <View style={styles.growCardButtons}>
            <Button
              title="🔗 Share Link"
              variant="primary"
              style={{ flex: 1 }}
              onPress={handleShareLink}
            />
          </View>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        )}

        {/* Connections Tab */}
        {!isLoading && activeTab === 'connections' && (
          <View style={styles.tabContent}>
            {/* Search Results */}
            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <View style={styles.section}>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={styles.sectionLabel}
                >
                  SEARCH RESULTS
                </Text>
                {searchResults.map((profile) => (
                  <SuggestionItem
                    key={profile.id}
                    profile={profile}
                    onAdd={handleAddFriend}
                    isLoading={loadingActions[profile.id]}
                  />
                ))}
              </View>
            )}

            {/* Friends List */}
            <View style={styles.section}>
              <Text
                variant="caption"
                color="tertiary"
                style={styles.sectionLabel}
              >
                ALL CONNECTIONS ({filteredFriends.length})
              </Text>
              {filteredFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text variant="body1" color="secondary" style={{ textAlign: 'center' }}>
                    {searchQuery
                      ? 'No friends match your search'
                      : "You haven't connected with anyone yet"}
                  </Text>
                </View>
              ) : (
                filteredFriends.map((friend) => (
                  <ConnectionItem
                    key={friend.friendship_id}
                    friend={friend}
                    onRemove={handleRemoveFriend}
                    onViewEvents={() => handleViewMutualEvents(friend)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Requests Tab */}
        {!isLoading && activeTab === 'requests' && (
          <View style={styles.tabContent}>
            {/* Pending Requests */}
            <View style={styles.section}>
              <Text
                variant="caption"
                color="tertiary"
                style={styles.sectionLabel}
              >
                PENDING REQUESTS ({pendingRequests.length})
              </Text>
              {pendingRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text variant="body1" color="secondary" style={{ textAlign: 'center' }}>
                    No pending requests
                  </Text>
                </View>
              ) : (
                pendingRequests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))
              )}
            </View>

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <View style={styles.section}>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={styles.sectionLabel}
                >
                  SENT REQUESTS ({sentRequests.length})
                </Text>
                {sentRequests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    type="sent"
                    onCancel={handleCancelRequest}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Suggestions Tab */}
        {!isLoading && activeTab === 'suggestions' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text
                variant="caption"
                color="tertiary"
                style={styles.sectionLabel}
              >
                PEOPLE YOU MAY KNOW
              </Text>
              {suggestions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text variant="body1" color="secondary" style={{ textAlign: 'center' }}>
                    No suggestions right now. Check back later!
                  </Text>
                </View>
              ) : (
                suggestions.map((profile) => (
                  <SuggestionItem
                    key={profile.id}
                    profile={profile}
                    onAdd={handleAddFriend}
                    isLoading={loadingActions[profile.id]}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mutual Events Modal */}
      <Modal
        visible={showMutualEventsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowMutualEventsModal(false);
          setSelectedFriend(null);
          setMutualEvents([]);
          setMutualEventsError(null);
        }}
      >
        <View style={[styles.mutualEventsModal, { backgroundColor: theme.colors.background.primary }]}>
          <View style={styles.mutualEventsHeader}>
            <View>
              <Text variant="h3">Mutual Events</Text>
              {selectedFriend && (
                <Text variant="body2" color="secondary">
                  With {selectedFriend.profile?.full_name || selectedFriend.profile?.username}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowMutualEventsModal(false);
                setSelectedFriend(null);
                setMutualEvents([]);
                setMutualEventsError(null);
              }}
              style={styles.closeButton}
            >
              <Text variant="body1" style={{ color: theme.colors.primary[500] }}>Done</Text>
            </TouchableOpacity>
          </View>

          {loadingMutualEvents ? (
            <View style={styles.mutualEventsLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            </View>
          ) : mutualEventsError ? (
            <View style={styles.mutualEventsEmpty}>
              <Text variant="h4" style={{ marginBottom: 8, textAlign: 'center' }}>
                Something went wrong
              </Text>
              <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
                {mutualEventsError}
              </Text>
            </View>
          ) : mutualEvents.length === 0 ? (
            <View style={styles.mutualEventsEmpty}>
              <Text variant="h4" style={{ marginBottom: 8, textAlign: 'center' }}>
                No mutual events yet
              </Text>
              <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
                When you both attend events, they'll show up here so you can reminisce!
              </Text>
            </View>
          ) : (
            <FlatList
              data={mutualEvents}
              keyExtractor={(item) => item.event_id}
              contentContainerStyle={styles.mutualEventsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.mutualEventCard, { backgroundColor: theme.colors.background.secondary }]}
                  onPress={() => {
                    setShowMutualEventsModal(false);
                    router.push(`/event/${item.event_id}`);
                  }}
                >
                  <Image
                    source={
                      item.event_image_url
                        ? { uri: item.event_image_url }
                        : require('../../assets/record.png')
                    }
                    style={[styles.mutualEventImage, { backgroundColor: theme.colors.gray[100] }]}
                    resizeMode="cover"
                  />
                  <View style={styles.mutualEventDetails}>
                    <Text variant="body1" numberOfLines={2} style={{ fontWeight: '600' }}>
                      {item.event_title || 'Untitled Event'}
                    </Text>
                    {item.venue_name && (
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        📍 {item.venue_name}
                      </Text>
                    )}
                    {item.event_date && (
                      <Text variant="caption" color="secondary">
                        📅 {format(new Date(item.event_date), 'MMM d, yyyy')}
                      </Text>
                    )}
                    {item.is_past && (
                      <View style={[styles.pastBadge, { backgroundColor: theme.colors.gray[200] }]}>
                        <Text variant="caption" style={{ color: theme.colors.gray[600], fontSize: 10 }}>
                          PAST
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  growCard: {
    margin: 16,
    padding: 16,
  },
  growCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  growCardText: {
    flex: 1,
    marginRight: 16,
  },
  growCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  growCardButtons: {
    flexDirection: 'row',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  connectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  connectionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorBadge: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  connectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: 50,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    zIndex: 100,
    minWidth: 140,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  // Mutual Events Modal styles
  mutualEventsModal: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  mutualEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 8,
  },
  mutualEventsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualEventsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  mutualEventsList: {
    paddingBottom: 24,
  },
  mutualEventCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  mutualEventImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  mutualEventDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  pastBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
});