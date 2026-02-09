import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from './ui';
import { UserAvatar } from './UserAvatar';
import { useTheme } from '../context/ThemeContext';
import type { FriendWithProfile } from '../api/friends';

interface FriendPickerListProps {
  friends: FriendWithProfile[];
  selectedIds: Set<string>;
  disabledIds: Set<string>;
  searchQuery: string;
  onToggle: (friendId: string) => void;
  onSearchChange: (query: string) => void;
  loading?: boolean;
}

export function FriendPickerList({
  friends,
  selectedIds,
  disabledIds,
  searchQuery,
  onToggle,
  onSearchChange,
  loading = false,
}: Readonly<FriendPickerListProps>) {
  const { theme } = useTheme();

  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      f =>
        f.profile?.full_name?.toLowerCase().includes(q) ||
        f.profile?.username?.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const renderFriendRow = ({ item }: { item: FriendWithProfile }) => {
    const isSelected = selectedIds.has(item.friend_id);
    const isDisabled = disabledIds.has(item.friend_id);

    return (
      <TouchableOpacity
        style={[
          styles.friendRow,
          { borderBottomColor: theme.colors.border.light },
          isDisabled && { opacity: 0.5 },
        ]}
        onPress={() => !isDisabled && onToggle(item.friend_id)}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <UserAvatar user={item.profile} size={40} />
        <View style={styles.friendInfo}>
          <Text variant="body1" style={{ fontWeight: '500' }}>
            {item.profile?.full_name || item.profile?.username || 'Unknown'}
          </Text>
          <Text variant="caption" color="secondary">
            @{item.profile?.username || 'username'}
          </Text>
        </View>

        {isDisabled ? (
          <View
            style={[
              styles.invitedBadge,
              { backgroundColor: theme.colors.gray[200] },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: theme.colors.text.tertiary, fontWeight: '500' }}
            >
              Invited
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected
                  ? theme.colors.primary[500]
                  : theme.colors.border.medium,
                backgroundColor: isSelected
                  ? theme.colors.primary[500]
                  : 'transparent',
              },
            ]}
          >
            {isSelected && (
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                ✓
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.light,
          },
        ]}
      >
        <Text style={{ marginRight: 8 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search friends..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Text color="tertiary">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Friend list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        </View>
      ) : filteredFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
            {searchQuery
              ? 'No friends match your search'
              : 'No friends to invite'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={item => item.friend_id}
          renderItem={renderFriendRow}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
