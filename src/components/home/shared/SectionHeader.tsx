import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  onSeeAll?: () => void;
  count?: number;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  emoji,
  onSeeAll,
  count,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text variant="h3" style={{ color: theme.colors.text.primary }}>
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary[100] }]}>
            <Text variant="caption" style={{ color: theme.colors.primary[700] }}>
              {count}
            </Text>
          </View>
        )}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text variant="body2" style={{ color: theme.colors.primary[600] }}>
            See All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
});
