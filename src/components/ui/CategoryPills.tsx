import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface CategoryPillsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const { theme } = useTheme();

  const categories = [
    { id: 'all', label: 'All', emoji: '🎭' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'bar', label: 'Bar', emoji: '🍺' },
    { id: 'theater', label: 'Theater', emoji: '🎭' },
    { id: 'comedy', label: 'Comedy', emoji: '😄' },
    { id: 'other', label: 'Other', emoji: '🎪' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected 
                    ? theme.colors.primary[500] 
                    : theme.colors.background.secondary,
                  borderColor: isSelected
                    ? theme.colors.primary[500]
                    : theme.colors.border.light,
                }
              ]}
              onPress={() => onCategoryChange(category.id)}
            >
              <Text variant="body2" style={styles.emoji}>
                {category.emoji}
              </Text>
              <Text 
                variant="body2" 
                color={isSelected ? 'inverse' : 'secondary'}
                style={styles.label}
              >
                {category.label}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingRight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emoji: {
    marginRight: 4,
    fontSize: 12,
  },
  label: {
    fontWeight: '500',
    fontSize: 13,
  },
});
