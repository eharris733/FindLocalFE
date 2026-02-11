import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFriends } from '../context/FriendsContext';
import { Text } from './ui';

interface FriendPickerProps {
  onSelectionChange: (selectedIds: string[]) => void;
  alreadyInvitedIds: string[];
  maxHeight?: number;
}

export function FriendPicker({ onSelectionChange, alreadyInvitedIds, maxHeight = 280 }: FriendPickerProps) {
  const { theme } = useTheme();
  const { friends } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const alreadyInvitedSet = useMemo(() => new Set(alreadyInvitedIds), [alreadyInvitedIds]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(f => {
      const name = f.profile?.full_name?.toLowerCase() || '';
      const username = f.profile?.username?.toLowerCase() || '';
      return name.includes(q) || username.includes(q);
    });
  }, [friends, searchQuery]);

  const toggleFriend = (friendId: string) => {
    if (alreadyInvitedSet.has(friendId)) return;

    const next = new Set(selectedIds);
    if (next.has(friendId)) {
      next.delete(friendId);
    } else {
      next.add(friendId);
    }
    setSelectedIds(next);
    onSelectionChange(Array.from(next));
  };

  if (friends.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background.secondary, borderRadius: 12 }]}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>👋</Text>
        <Text variant="body2" style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
          Add friends to send direct invites
        </Text>
      </View>
    );
  }

  const renderFriend = ({ item }: { item: typeof friends[0] }) => {
    const isAlreadyInvited = alreadyInvitedSet.has(item.friend_id);
    const isSelected = selectedIds.has(item.friend_id);
    const disabled = isAlreadyInvited;

    return (
      <TouchableOpacity
        style={[
          styles.friendRow,
          { borderBottomColor: theme.colors.border.light },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => toggleFriend(item.friend_id)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {item.profile?.avatar_url ? (
          <Image source={{ uri: item.profile.avatar_url }} style={[styles.avatar, { backgroundColor: theme.colors.gray[200] }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
            <Text style={{ fontSize: 16 }}>
              {item.profile?.full_name?.[0] || item.profile?.username?.[0] || '?'}
            </Text>
          </View>
        )}

        {/* Name + username */}
        <View style={styles.friendInfo}>
          <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
            {item.profile?.full_name || item.profile?.username || 'Unknown'}
          </Text>
          {item.profile?.username && (
            <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
              @{item.profile.username}
            </Text>
          )}
        </View>

        {/* Checkbox / Invited label */}
        {isAlreadyInvited ? (
          <View style={[styles.invitedBadge, { backgroundColor: theme.colors.success + '20' }]}>
            <Text variant="caption" style={{ color: theme.colors.success, fontWeight: '600' }}>
              Invited
            </Text>
          </View>
        ) : (
          <View style={[
            styles.checkbox,
            { borderColor: isSelected ? theme.colors.primary[500] : theme.colors.gray[300] },
            isSelected && { backgroundColor: theme.colors.primary[500] },
          ]}>
            {isSelected && (
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* Search bar */}
      <TextInput
        style={[styles.searchInput, {
          backgroundColor: theme.colors.background.secondary,
          color: theme.colors.text.primary,
          borderColor: theme.colors.border.light,
        }]}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search friends..."
        placeholderTextColor={theme.colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Friends list */}
      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.friend_id}
        style={{ maxHeight }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text variant="body2" style={{ color: theme.colors.text.tertiary }}>
              No friends match "{searchQuery}"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  searchInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});
