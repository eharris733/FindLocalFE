import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { SectionHeader } from '../shared';
import { useTheme } from '../../../context/ThemeContext';
import type { Community } from '../../../api/communities';

interface CommunityBrowseSectionProps {
  communities: Community[];
  onCommunityPress: (community: Community) => void;
  loading?: boolean;
}

export const CommunityBrowseSection: React.FC<CommunityBrowseSectionProps> = ({
  communities,
  onCommunityPress,
  loading = false,
}) => {
  const { theme } = useTheme();

  if (loading || communities.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <SectionHeader title="Browse by Interest" emoji="🎯" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {communities.slice(0, 8).map((community) => {
          const color = community.metadata?.color || theme.colors.primary[500];
          const icon = community.metadata?.icon || '🎵';

          return (
            <TouchableOpacity
              key={community.id}
              style={[styles.pill, { backgroundColor: color + '20', borderColor: color }]}
              onPress={() => onCommunityPress(community)}
            >
              <Text style={styles.pillIcon}>{icon}</Text>
              <Text variant="body2" style={[styles.pillText, { color }]}>
                {community.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillIcon: {
    fontSize: 16,
  },
  pillText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
