// src/components/ui/Avatar.tsx
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface AvatarProps {
  /**
   * URL of the avatar image
   */
  imageUrl?: string | null;
  /**
   * Full name for generating initials as fallback
   */
  name?: string | null;
  /**
   * Size of the avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Show indicator dot (e.g., online status)
   */
  showIndicator?: boolean;
  /**
   * Color of indicator dot
   */
  indicatorColor?: string;
  /**
   * Custom style overrides
   */
  style?: ViewStyle;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
};

export function Avatar({
  imageUrl,
  name,
  size = 'md',
  showIndicator = false,
  indicatorColor,
  style,
}: AvatarProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const getInitials = (fullName?: string | null): string => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    overflow: 'hidden',
    ...style,
  };

  return (
    <View style={containerStyle}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: theme.colors.primary[500],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant="body2"
            style={{
              color: '#fff',
              fontWeight: '600',
              fontSize,
            }}
          >
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showIndicator && (
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: indicatorColor || theme.colors.success,
              borderColor: theme.colors.background.primary,
              width: dimension * 0.3,
              height: dimension * 0.3,
              borderRadius: (dimension * 0.3) / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

// Stacked avatar group for showing multiple attendees
interface AvatarGroupProps {
  avatars: Array<{ imageUrl?: string | null; name?: string | null }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  extraCount?: number;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', extraCount = 0 }: AvatarGroupProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];
  const displayAvatars = avatars.slice(0, max);
  const remaining = extraCount || (avatars.length > max ? avatars.length - max : 0);

  return (
    <View style={styles.avatarGroup}>
      {displayAvatars.map((avatar, index) => (
        <View
          key={index}
          style={{
            marginLeft: index > 0 ? -dimension * 0.3 : 0,
            zIndex: displayAvatars.length - index,
          }}
        >
          <Avatar
            imageUrl={avatar.imageUrl}
            name={avatar.name}
            size={size}
            style={{
              borderWidth: 2,
              borderColor: theme.colors.background.primary,
            }}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={{
            marginLeft: -dimension * 0.3,
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: theme.colors.gray[200],
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.colors.background.primary,
          }}
        >
          <Text
            variant="caption"
            style={{
              color: theme.colors.text.secondary,
              fontWeight: '600',
              fontSize: fontSize - 2,
            }}
          >
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
