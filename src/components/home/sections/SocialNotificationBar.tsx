import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useSocialNotificationsQuery } from '../../../hooks/queries/useSocialNotificationsQuery';

export const SocialNotificationBar: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: notifications, isLoading } = useSocialNotificationsQuery();

  // Don't render if loading or no notifications
  if (isLoading || !notifications || notifications.total === 0) {
    return null;
  }

  const parts: string[] = [];

  if (notifications.pendingFriendRequests > 0) {
    parts.push(`${notifications.pendingFriendRequests} friend request${notifications.pendingFriendRequests > 1 ? 's' : ''}`);
  }

  if (notifications.pendingInvitations > 0) {
    parts.push(`${notifications.pendingInvitations} event invite${notifications.pendingInvitations > 1 ? 's' : ''}`);
  }

  if (notifications.newFollowers > 0) {
    parts.push(`${notifications.newFollowers} new follower${notifications.newFollowers > 1 ? 's' : ''}`);
  }

  const message = parts.join(' · ');

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.primary[50] }]}
      onPress={() => router.push('/(private)/profile')}
    >
      <Text style={styles.bell}>🔔</Text>
      <Text variant="body2" style={[styles.text, { color: theme.colors.primary[700] }]}>
        {message}
      </Text>
      <Text style={[styles.arrow, { color: theme.colors.primary[500] }]}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  bell: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '600',
  },
});
