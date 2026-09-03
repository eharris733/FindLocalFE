import React from 'react';
import { Platform, Text, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './iconNames';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

const ionicMap: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  map: 'map-outline',
  list: 'list-outline',
  bookmark: 'bookmark-outline',
  'bookmark-filled': 'bookmark',
  filter: 'options-outline',
  share: 'share-outline',
  calendar: 'calendar-outline',
  heart: 'heart-outline',
  'heart-filled': 'heart',
  'arrow-back': 'arrow-back',
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-forward',
  location: 'location-outline',
  clock: 'time-outline',
  close: 'close',
  menu: 'menu',
  search: 'search-outline',
};

const materialMap: Record<IconName, string> = {
  map: 'map',
  list: 'list',
  bookmark: 'bookmark',
  'bookmark-filled': 'bookmark',
  filter: 'tune',
  share: 'share',
  calendar: 'calendar_month',
  heart: 'favorite',
  'heart-filled': 'favorite',
  'arrow-back': 'arrow_back',
  'chevron-down': 'expand_more',
  'chevron-right': 'chevron_right',
  location: 'location_on',
  clock: 'schedule',
  close: 'close',
  menu: 'menu',
  search: 'search',
};

const filledOnWeb = new Set<IconName>(['bookmark-filled', 'heart-filled', 'filter']);

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#000', style }) => {
  if (Platform.OS === 'web') {
    const isFilled = filledOnWeb.has(name);
    return (
      <Text
        style={
          [
            {
              fontFamily: 'Material Symbols Outlined',
              fontWeight: '400',
              fontSize: size,
              lineHeight: size,
              color,
            },
            // CSS-only props for react-native-web
            { fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}, 'opsz' 24`, userSelect: 'none' } as any,
            style,
          ] as any
        }
        accessibilityLabel={name}
      >
        {materialMap[name]}
      </Text>
    );
  }

  return <Ionicons name={ionicMap[name]} size={size} color={color} style={style} />;
};
