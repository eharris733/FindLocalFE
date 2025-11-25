import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { EVENT_CATEGORY_OPTIONS } from '../../constants/eventCategories';

interface WhatDropdownProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  multiSelect?: boolean;
  availableEventTypes?: string[]; // Event types that have events available
}

export const WhatDropdown: React.FC<WhatDropdownProps> = ({
  selectedCategories,
  onCategoriesChange,
  multiSelect = true,
  availableEventTypes,
}) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Helper to check if a category is available based on its event types
  const isCategoryAvailable = (categoryId: string): boolean => {
    // 'all' and 'favorites' are always available
    if (categoryId === 'all' || categoryId === 'favorites') return true;
    
    // If no filter data available, show all categories
    if (!availableEventTypes || availableEventTypes.length === 0) return true;
    
    const category = EVENT_CATEGORY_OPTIONS.find(c => c.id === categoryId);
    if (!category) return true;
    
    // For music genre categories, check if the genre exists in availableEventTypes
    if (category.musicGenre) {
      const genreInEventTypes = availableEventTypes.includes(category.musicGenre);
      return genreInEventTypes;
    }
    
    // If category has no event types defined, it's available
    if (!category.eventTypes || category.eventTypes.length === 0) return true;
    
    // Check if any of the category's event types are available
    return category.eventTypes.some(eventType => 
      availableEventTypes.includes(eventType)
    );
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === 'all') {
      onCategoriesChange(['all']);
      return;
    }

    if (!multiSelect) {
      onCategoriesChange([categoryId]);
      setShowModal(false);
      return;
    }

    // Multi-select logic
    let newSelection = selectedCategories.filter(c => c !== 'all');
    
    if (newSelection.includes(categoryId)) {
      // Remove category
      newSelection = newSelection.filter(c => c !== categoryId);
      
      // If nothing selected, default to 'all'
      if (newSelection.length === 0) {
        onCategoriesChange(['all']);
      } else {
        onCategoriesChange(newSelection);
      }
    } else {
      // Add category
      newSelection = [...newSelection, categoryId];
      onCategoriesChange(newSelection);
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
      return 'All Events';
    }
    
    if (selectedCategories.length === 1) {
      const category = EVENT_CATEGORY_OPTIONS.find(c => c.id === selectedCategories[0]);
      return category?.label || selectedCategories[0];
    }
    
    return `${selectedCategories.length} categories`;
  };

  // Group categories by theme
  const categoryGroups = [
    {
      title: 'Popular',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['all', 'favorites', 'free', 'jazz'].includes(cat.id)
      )
    },
    {
      title: 'Music',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        cat.id === 'music' || cat.musicGenre !== undefined
      )
    },
    {
      title: 'Performance & Entertainment',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['comedy', 'theater', 'dance', 'film'].includes(cat.id)
      )
    },
    {
      title: 'Arts & Culture',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['art', 'literary'].includes(cat.id)
      )
    },
    {
      title: 'Social & Nightlife',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['nightlife', 'food_drink', 'trivia', 'karaoke', 'networking', 'date_night'].includes(cat.id)
      )
    },
    {
      title: 'Sports & Fitness',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['sports', 'fitness'].includes(cat.id)
      )
    },
    {
      title: 'Educational & Community',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['workshop', 'lecture', 'tours', 'community'].includes(cat.id)
      )
    },
    {
      title: 'Markets & Festivals',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['market', 'festival'].includes(cat.id)
      )
    },
    {
      title: 'Special',
      categories: EVENT_CATEGORY_OPTIONS.filter(cat => 
        ['family'].includes(cat.id)
      )
    }
  ].filter(group => group.categories.length > 0);

  return (
    <>
      <View style={styles.container}>
        <Text variant="caption" color="tertiary" style={styles.label}>
          WHAT
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: theme.colors.border.light,
            }
          ]}
          onPress={() => setShowModal(true)}
        >
          <Text variant="body2" color="primary" style={styles.buttonText}>
            {getDisplayText()}
          </Text>
          <Text variant="body2" color="secondary" style={{ fontSize: 14 }}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setShowModal(false)}
        >
          <View 
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.background.primary }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text variant="h3">Select Categories</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {categoryGroups.map((group) => (
                <View key={group.title} style={styles.categoryGroup}>
                  <Text variant="caption" color="tertiary" style={styles.groupTitle}>
                    {group.title.toUpperCase()}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {group.categories.map((category) => {
                      const isSelected = selectedCategories.includes(category.id);
                      const isAvailable = isCategoryAvailable(category.id);
                      
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSelected 
                                ? theme.colors.primary[500] 
                                : theme.colors.background.secondary,
                              borderColor: isSelected
                                ? theme.colors.primary[500]
                                : theme.colors.border.light,
                              opacity: isAvailable ? 1 : 0.3,
                            }
                          ]}
                          onPress={() => handleCategoryToggle(category.id)}
                          disabled={!isAvailable}
                        >
                          <Text variant="body2" style={styles.categoryEmoji}>
                            {category.emoji}
                          </Text>
                          <Text 
                            variant="body2" 
                            color={isSelected ? 'inverse' : 'secondary'}
                            style={styles.categoryLabel}
                          >
                            {category.label}
                          </Text>
                          {isSelected && (
                            <Text style={[styles.checkmark, { color: '#FFF', fontSize: 14 }]}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border.light }]}>
              <Text variant="body2" color="secondary">
                {selectedCategories.includes('all') || selectedCategories.length === 0
                  ? 'All categories selected'
                  : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'} selected`}
              </Text>
              <TouchableOpacity 
                style={[styles.doneButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={() => setShowModal(false)}
              >
                <Text variant="body2" color="inverse" style={styles.doneButtonText}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minWidth: 140,
    flex: 1,
  },
  label: {
    marginBottom: 4,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  buttonText: {
    fontWeight: '600',
    marginRight: 4,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalScroll: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  categoryGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  categoryEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  categoryLabel: {
    fontWeight: '500',
    fontSize: 13,
  },
  checkmark: {
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    fontWeight: '600',
  },
});
