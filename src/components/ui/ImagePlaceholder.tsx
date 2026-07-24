import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '../../context/ThemeContext';

interface ImagePlaceholderProps {
  /** 'event' → category emoji / calendar icon; 'venue' → location icon. */
  kind?: 'event' | 'venue';
  /** Drives the category emoji when kind='event'. */
  eventTypes?: string[] | null;
  /** Glyph size. The caller supplies dimensions/borderRadius via style. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const CATEGORY_GLYPHS: Array<{ pattern: RegExp; glyph: string }> = [
  { pattern: /music|concert|dj|band|karaoke/i, glyph: '🎵' },
  { pattern: /comedy|open.?mic|improv|stand.?up/i, glyph: '🎤' },
  { pattern: /art|theater|theatre|dance|drag/i, glyph: '🎭' },
  { pattern: /film|movie|cinema/i, glyph: '🎬' },
  { pattern: /trivia|quiz|game|bingo/i, glyph: '🎲' },
  { pattern: /food|drink|beer|wine|market/i, glyph: '🍻' },
];

/** First category emoji matching an event_type token, or null for the icon fallback. */
export const categoryGlyph = (eventTypes?: string[] | null): string | null => {
  for (const type of eventTypes ?? []) {
    const match = CATEGORY_GLYPHS.find(({ pattern }) => pattern.test(type));
    if (match) return match.glyph;
  }
  return null;
};

/**
 * Shared fallback art for missing event/venue images: sunken surface with a
 * centered glyph. Emoji over bundled PNGs on purpose — asset requires have
 * silently failed under react-native-web before (see CustomMapMarker).
 */
export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  kind = 'event',
  eventTypes,
  size = 40,
  style,
}) => {
  const { theme } = useTheme();
  const glyph = kind === 'event' ? categoryGlyph(eventTypes) : null;

  return (
    <View
      style={[
        { backgroundColor: theme.colors.surface.sunken, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {glyph ? (
        <Text style={{ fontSize: size, lineHeight: Math.round(size * 1.2) }}>{glyph}</Text>
      ) : (
        <Icon
          name={kind === 'venue' ? 'location' : 'calendar'}
          size={size}
          color={theme.colors.text.tertiary}
        />
      )}
    </View>
  );
};
