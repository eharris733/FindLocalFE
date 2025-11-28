import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useCommunity } from '../../context/CommunityContext';
import { logger } from '../../utils/logger';

interface WhatDropdownProps {
  selectedLabels?: string[];
  onLabelsChange?: (labels: string[]) => void;
  // Legacy props for backward compatibility
  selectedCategories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  multiSelect?: boolean;
  availableEventTypes?: string[];
}

export const WhatDropdown: React.FC<WhatDropdownProps> = ({
  selectedLabels: selectedLabelsProp,
  onLabelsChange: onLabelsChangeProp,
  // Legacy props
  selectedCategories,
  onCategoriesChange,
  multiSelect,
  availableEventTypes,
}) => {
  const { theme } = useTheme();
  const { selectedCommunities, allCommunities, labelsForCity } = useCommunity();
  const [showModal, setShowModal] = useState(false);

  // Use new props if provided, otherwise fall back to legacy props
  const selectedLabels = selectedLabelsProp ?? selectedCategories ?? [];
  const onLabelsChange = onLabelsChangeProp ?? onCategoriesChange ?? (() => {});

  // Get labels for selected communities only
  const availableLabels = useMemo(() => {
    if (selectedCommunities.length === 0) {
      // Show all labels if all communities selected
      logger.info('📋 WhatDropdown: Showing all labels', Object.keys(labelsForCity).length, 'communities');
      return labelsForCity;
    }

    // Filter labels to only selected communities
    const filtered: typeof labelsForCity = {};
    selectedCommunities.forEach(communityName => {
      if (labelsForCity[communityName]) {
        filtered[communityName] = labelsForCity[communityName];
      }
    });
    logger.info('📋 WhatDropdown: Filtered labels for', selectedCommunities, ':', Object.keys(filtered).length, 'communities');
    return filtered;
  }, [selectedCommunities, labelsForCity]);

  const handleLabelToggle = (label: string) => {
    const newSelection = selectedLabels.includes(label)
      ? selectedLabels.filter(l => l !== label)
      : [...selectedLabels, label];
    
    onLabelsChange(newSelection);
  };

  const getDisplayText = () => {
    if (!selectedLabels || selectedLabels.length === 0) {
      return 'All Events';
    }
    if (selectedLabels.length === 1) {
      return selectedLabels[0];
    }
    return `${selectedLabels.length} labels`;
  };

  const getCommunityColor = (communityName: string) => {
    const community = allCommunities.find(c => c.name === communityName);
    return community?.metadata.color || theme.colors.primary[500];
  };

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

      {/* Labels Modal */}
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
              <Text variant="h3">Select Labels</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {Object.keys(availableLabels).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text variant="h4" color="tertiary" style={{ textAlign: 'center', marginBottom: 8 }}>📋</Text>
                  <Text variant="body1" color="secondary" style={{ textAlign: 'center', marginBottom: 4 }}>
                    No labels available yet
                  </Text>
                  <Text variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                    Labels will appear here once they're added to the database for your selected communities.
                  </Text>
                </View>
              ) : (
                Object.entries(availableLabels).map(([communityName, labels]) => (
                <View key={communityName} style={styles.categoryGroup}>
                  <Text
                    variant="caption"
                    color="tertiary"
                    style={[styles.groupTitle, { color: getCommunityColor(communityName) }]}
                  >
                    {communityName.toUpperCase()}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {labels.map((labelObj) => {
                      const isSelected = selectedLabels.includes(labelObj.label);
                      return (
                        <TouchableOpacity
                          key={labelObj.id}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSelected
                                ? getCommunityColor(communityName)
                                : theme.colors.background.secondary,
                              borderColor: isSelected
                                ? getCommunityColor(communityName)
                                : theme.colors.border.light,
                            }
                          ]}
                          onPress={() => handleLabelToggle(labelObj.label)}
                        >
                          <Text
                            variant="body2"
                            color={isSelected ? 'inverse' : 'secondary'}
                            style={styles.categoryLabel}
                          >
                            {labelObj.label}
                          </Text>
                          {isSelected && (
                            <Text style={[styles.checkmark, { color: '#FFF' }]}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border.light }]}>
              <Text variant="body2" color="secondary">
                {!selectedLabels || selectedLabels.length === 0
                  ? 'All labels'
                  : `${selectedLabels.length} ${selectedLabels.length === 1 ? 'label' : 'labels'} selected`}
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
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
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
    fontSize: 14,
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
