import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { ALL_VENUES } from '../../constants';

interface WhereDropdownProps {
  selectedVenueTypes: string[];
  selectedRegions: string[];
  selectedSizes: string[];
  availableRegions: string[];
  availableVenueTypes?: string[];
  availableSizes?: string[];
  onVenueTypesChange: (venueTypes: string[]) => void;
  onRegionsChange: (regions: string[]) => void;
  onSizesChange: (sizes: string[]) => void;
}

// Venue size options
const VENUE_SIZE_OPTIONS = [
  { id: '<100', label: 'Small (<100)', emoji: '👥' },
  { id: '100+', label: 'Medium (100+)', emoji: '👥👥' },
  { id: '300+', label: 'Large (300+)', emoji: '👥👥👥' },
];

// Venue type display configuration
const VENUE_TYPE_CONFIG = [
  { id: 'bar', label: 'Bar', emoji: '🍺', group: 'Nightlife & Entertainment' },
  { id: 'night_club', label: 'Night Club', emoji: '🎉', group: 'Nightlife & Entertainment' },
  { id: 'jazz_club', label: 'Jazz Club', emoji: '🎷', group: 'Nightlife & Entertainment' },
  { id: 'comedy_club', label: 'Comedy Club', emoji: '😂', group: 'Nightlife & Entertainment' },
  { id: 'lounge', label: 'Lounge', emoji: '🛋️', group: 'Nightlife & Entertainment' },
  { id: 'theater', label: 'Theater', emoji: '🎭', group: 'Performance Venues' },
  { id: 'concert_hall', label: 'Concert Hall', emoji: '🎵', group: 'Performance Venues' },
  { id: 'stadium', label: 'Stadium', emoji: '🏟️', group: 'Performance Venues' },
  { id: 'museum', label: 'Museum', emoji: '🏛️', group: 'Cultural & Educational' },
  { id: 'gallery', label: 'Gallery', emoji: '🖼️', group: 'Cultural & Educational' },
  { id: 'library', label: 'Library', emoji: '📚', group: 'Cultural & Educational' },
  { id: 'book_store', label: 'Book Store', emoji: '📖', group: 'Cultural & Educational' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️', group: 'Dining & Social' },
  { id: 'cafe', label: 'Café', emoji: '☕', group: 'Dining & Social' },
  { id: 'brewery', label: 'Brewery', emoji: '🍻', group: 'Dining & Social' },
  { id: 'winery', label: 'Winery', emoji: '🍷', group: 'Dining & Social' },
  { id: 'gym', label: 'Gym', emoji: '💪', group: 'Fitness & Recreation' },
  { id: 'studio', label: 'Studio', emoji: '🧘', group: 'Fitness & Recreation' },
  { id: 'sports_complex', label: 'Sports Complex', emoji: '⚽', group: 'Fitness & Recreation' },
  { id: 'community_center', label: 'Community Center', emoji: '🏘️', group: 'Community' },
  { id: 'church', label: 'Church', emoji: '⛪', group: 'Community' },
  { id: 'school', label: 'School', emoji: '🏫', group: 'Community' },
  { id: 'convention_center', label: 'Convention Center', emoji: '🏢', group: 'Community' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌳', group: 'Other' },
];

export const WhereDropdown: React.FC<WhereDropdownProps> = ({
  selectedVenueTypes,
  selectedRegions,
  selectedSizes,
  availableRegions,
  availableVenueTypes,
  availableSizes,
  onVenueTypesChange,
  onRegionsChange,
  onSizesChange,
}) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Helper to check if venue type is available (case-insensitive, flexible matching)
  const isVenueTypeAvailable = (venueTypeId: string): boolean => {
    if (!availableVenueTypes || availableVenueTypes.length === 0) return true; // Show all if no filter data
    const normalized = venueTypeId.toLowerCase().trim().replace(/[_\s]+/g, '');
    return availableVenueTypes.some(available => {
      const availableNormalized = available.toLowerCase().trim().replace(/[_\s]+/g, '');
      return availableNormalized === normalized || 
             availableNormalized.includes(normalized) ||
             normalized.includes(availableNormalized);
    });
  };

  // Helper to check if size is available
  const isSizeAvailable = (sizeId: string): boolean => {
    if (!availableSizes || availableSizes.length === 0) return true; // Show all if no filter data
    // Map size IDs to database values
    const sizeMapping: Record<string, string[]> = {
      '<100': ['small', 's'],
      '100+': ['medium', 'm'],
      '300+': ['large', 'l'],
    };
    const mappedValues = sizeMapping[sizeId] || [];
    return availableSizes.some(available => 
      mappedValues.some(val => available.toLowerCase().includes(val))
    );
  };

  const handleVenueTypeToggle = (venueTypeId: string) => {
    let newSelection = [...selectedVenueTypes];
    
    if (newSelection.includes(venueTypeId)) {
      newSelection = newSelection.filter(v => v !== venueTypeId);
    } else {
      newSelection = [...newSelection, venueTypeId];
    }
    
    onVenueTypesChange(newSelection);
  };

  const handleRegionToggle = (region: string) => {
    let newSelection = [...selectedRegions];
    
    if (newSelection.includes(region)) {
      newSelection = newSelection.filter(r => r !== region);
    } else {
      newSelection = [...newSelection, region];
    }
    
    onRegionsChange(newSelection);
  };

  const handleSizeToggle = (sizeId: string) => {
    let newSelection = [...selectedSizes];
    
    if (newSelection.includes(sizeId)) {
      // Remove the size
      newSelection = newSelection.filter(s => s !== sizeId);
      // If no sizes left, add ALL_VENUES back
      if (newSelection.length === 0) {
        newSelection = [ALL_VENUES];
      }
    } else {
      // Adding a size - remove ALL_VENUES if present
      newSelection = newSelection.filter(s => s !== ALL_VENUES);
      newSelection = [...newSelection, sizeId];
    }
    
    onSizesChange(newSelection);
  };

  const handleClearRegions = () => {
    onRegionsChange([]);
  };

  // Get display text
  const getDisplayText = () => {
    // Filter out ALL_VENUES from size since it's the default "no filter" state
    const activeSizes = selectedSizes.filter(s => s !== ALL_VENUES);
    const totalSelected = selectedVenueTypes.length + selectedRegions.length + activeSizes.length;
    
    if (totalSelected === 0) {
      return 'All Locations';
    }
    
    if (totalSelected === 1) {
      if (selectedVenueTypes.length === 1) {
        const venueType = VENUE_TYPE_CONFIG.find(v => v.id === selectedVenueTypes[0]);
        return venueType?.label || selectedVenueTypes[0];
      }
      if (activeSizes.length === 1) {
        const size = VENUE_SIZE_OPTIONS.find(s => s.id === activeSizes[0]);
        return size?.label || activeSizes[0];
      }
      return selectedRegions[0];
    }
    
    return `${totalSelected} filters`;
  };

  // Group venue types
  const venueTypeGroups = [
    {
      title: 'Nightlife & Entertainment',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Nightlife & Entertainment')
    },
    {
      title: 'Performance Venues',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Performance Venues')
    },
    {
      title: 'Cultural & Educational',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Cultural & Educational')
    },
    {
      title: 'Dining & Social',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Dining & Social')
    },
    {
      title: 'Fitness & Recreation',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Fitness & Recreation')
    },
    {
      title: 'Community',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Community')
    },
    {
      title: 'Other',
      types: VENUE_TYPE_CONFIG.filter(v => v.group === 'Other')
    },
  ].filter(group => group.types.length > 0);

  return (
    <>
      <View style={styles.container}>
        <Text variant="caption" color="tertiary" style={styles.label}>
          WHERE
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

      {/* Location Modal */}
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
              <Text variant="h3">Select Locations</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              automaticallyAdjustKeyboardInsets={false}
            >
              {/* Venue Types Section */}
              <View style={styles.section}>
                <Text variant="h4" style={styles.sectionTitle}>
                  Venue Types
                </Text>
                {venueTypeGroups.map((group) => {
                  return (
                  <View 
                    key={group.title} 
                    style={styles.venueTypeGroup}
                  >
                    <Text variant="caption" color="tertiary" style={styles.groupTitle}>
                      {group.title.toUpperCase()}
                    </Text>
                    <View style={styles.venueTypeGrid}>
                      {group.types.map((venueType) => {
                        const isAvailable = isVenueTypeAvailable(venueType.id);
                        const isSelected = selectedVenueTypes.includes(venueType.id);
                        
                        return (
                          <TouchableOpacity
                            key={venueType.id}
                            style={[
                              styles.venueTypePill,
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
                            onPress={() => handleVenueTypeToggle(venueType.id)}
                            disabled={!isAvailable}
                          >
                            <Text variant="body2" style={styles.venueTypeEmoji}>
                              {venueType.emoji}
                            </Text>
                            <Text 
                              variant="body2" 
                              color={isSelected ? 'inverse' : 'secondary'}
                              style={styles.venueTypeLabel}
                            >
                              {venueType.label}
                            </Text>
                            {isSelected && (
                              <Text style={[styles.checkmark, { color: '#FFF', fontSize: 14 }]}>✓</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  );
                })}
              </View>

              {/* Venue Size Section */}
              <View style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.colors.border.light }]}>
                <Text variant="h4" style={styles.sectionTitle}>
                  Venue Size
                </Text>
                <View style={styles.sizeGrid}>
                  {VENUE_SIZE_OPTIONS.filter(size => isSizeAvailable(size.id)).map((size) => {
                    const isSelected = selectedSizes.includes(size.id);
                    return (
                      <TouchableOpacity
                        key={size.id}
                        style={[
                          styles.sizePill,
                          {
                            backgroundColor: isSelected 
                              ? theme.colors.primary[500] 
                              : theme.colors.background.secondary,
                            borderColor: isSelected
                              ? theme.colors.primary[500]
                              : theme.colors.border.light,
                          }
                        ]}
                        onPress={() => handleSizeToggle(size.id)}
                      >
                        <Text variant="body2" style={styles.sizeEmoji}>
                          {size.emoji}
                        </Text>
                        <Text 
                          variant="body2" 
                          color={isSelected ? 'inverse' : 'secondary'}
                          style={styles.sizeLabel}
                        >
                          {size.label}
                        </Text>
                        {isSelected && (
                          <Text style={[styles.checkmark, { color: '#FFF', fontSize: 14 }]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Regions Section */}
              {availableRegions.length > 0 && (
                <View 
                  style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.colors.border.light }]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text variant="h4" style={styles.sectionTitle}>
                      Regions
                    </Text>
                    <TouchableOpacity 
                      onPress={handleClearRegions}
                      disabled={selectedRegions.length === 0}
                      style={{ opacity: selectedRegions.length > 0 ? 1 : 0 }}
                    >
                      <Text variant="body2" color="primary" style={styles.clearButton}>
                        Clear All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.regionsGrid}>
                    {availableRegions.map((region) => {
                      const isSelected = selectedRegions.includes(region);
                      return (
                        <TouchableOpacity
                          key={region}
                          style={[
                            styles.regionPill,
                            {
                              backgroundColor: isSelected 
                                ? theme.colors.secondary[500] 
                                : theme.colors.background.secondary,
                              borderColor: isSelected
                                ? theme.colors.secondary[500]
                                : theme.colors.border.light,
                            }
                          ]}
                          onPress={() => handleRegionToggle(region)}
                        >
                          <Text 
                            variant="body2" 
                            color={isSelected ? 'inverse' : 'secondary'}
                            style={styles.regionLabel}
                          >
                            {region}
                          </Text>
                          {isSelected && (
                            <Text style={[styles.checkmark, { color: '#FFF', fontSize: 14 }]}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border.light }]}>
              <Text variant="body2" color="secondary">
                {selectedVenueTypes.length + selectedRegions.length === 0
                  ? 'All locations'
                  : `${selectedVenueTypes.length + selectedRegions.length} ${selectedVenueTypes.length + selectedRegions.length === 1 ? 'filter' : 'filters'} selected`}
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
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    fontWeight: '600',
  },
  venueTypeGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  venueTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  venueTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  venueTypeEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  venueTypeLabel: {
    fontWeight: '500',
    fontSize: 13,
  },
  checkmark: {
    marginLeft: 4,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  sizeEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  sizeLabel: {
    fontWeight: '500',
    fontSize: 13,
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  regionLabel: {
    fontWeight: '500',
    fontSize: 13,
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
