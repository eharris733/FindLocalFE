import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import type { Profile } from '../api/profiles';

interface UserAvatarProps {
  user: Profile;
  size?: number;
  showOnlineIndicator?: boolean;
}

export function UserAvatar({
  user,
  size = 40,
  showOnlineIndicator = false,
}: Readonly<UserAvatarProps>) {
  const { theme } = useTheme();
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.username?.[0]?.toUpperCase() || '?';

  const colorIndex = user.id ? user.id.charCodeAt(0) % 5 : 0;
  const avatarColors = [
    theme.colors.primary[500],
    theme.colors.secondary[500],
    theme.colors.accent[500],
    '#6366F1',
    '#8B5CF6',
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
