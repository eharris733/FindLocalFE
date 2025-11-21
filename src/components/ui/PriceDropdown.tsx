import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface PriceRange {
  min?: number;
  max?: number;
  label: string;
}

const PRICE_OPTIONS: PriceRange[] = [
  { label: 'Free', min: 0, max: 0 },
  { label: 'Under $25', min: 0, max: 25 },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50+', min: 50 },
  { label: 'Any Price' },
];

interface PriceDropdownProps {
  selectedPrice?: { min?: number; max?: number };
  availablePriceRanges?: string[];
  onPriceChange: (range?: { min?: number; max?: number }) => void;
}

export const PriceDropdown: React.FC<PriceDropdownProps> = ({
  selectedPrice,
  availablePriceRanges,
  onPriceChange,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Helper to check if a price range is available
  const isPriceRangeAvailable = (option: PriceRange): boolean => {
    if (!availablePriceRanges || availablePriceRanges.length === 0) return true;
    if (!option.min && !option.max) return true; // "Any Price" is always available
    
    // Map option to range key
    if (option.min === 0 && option.max === 0) {
      return availablePriceRanges.includes('free');
    } else if (option.max === 25) {
      return availablePriceRanges.includes('under25') || availablePriceRanges.includes('free');
    } else if (option.max === 50) {
      return availablePriceRanges.includes('under50') || availablePriceRanges.includes('under25') || availablePriceRanges.includes('free');
    } else if (option.min === 50) {
      return availablePriceRanges.includes('50plus');
    }
    return true;
  };

  const getSelectedLabel = () => {
    if (!selectedPrice) return 'Price';
    
    const option = PRICE_OPTIONS.find(
      opt => opt.min === selectedPrice.min && opt.max === selectedPrice.max
    );
    return option?.label || 'Price';
  };

  const isSelected = (option: PriceRange) => {
    if (!selectedPrice && !option.min && !option.max) return true;
    if (!selectedPrice) return false;
    return option.min === selectedPrice.min && option.max === selectedPrice.max;
  };

  const handleSelect = (option: PriceRange) => {
    if (!option.min && !option.max) {
      onPriceChange(undefined);
    } else {
      onPriceChange({ min: option.min, max: option.max });
    }
    setIsModalVisible(false);
  };

  const hasActiveFilter = selectedPrice !== undefined;

  return (
    <>
      <View style={styles.container}>
        <Text variant="caption" color="tertiary" style={styles.label}>
          PRICE
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            { 
              backgroundColor: hasActiveFilter ? theme.colors.primary[500] : theme.colors.background.secondary,
              borderColor: hasActiveFilter ? theme.colors.primary[500] : theme.colors.border.light,
            }
          ]}
          onPress={() => setIsModalVisible(true)}
        >
          <Text variant="body2" style={[
            styles.buttonText,
            { color: hasActiveFilter ? '#FFFFFF' : theme.colors.text.primary }
          ]}>
            {getSelectedLabel()}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={hasActiveFilter ? '#FFFFFF' : theme.colors.text.secondary} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <View 
            style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Filter by Price
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsContainer}>
              {PRICE_OPTIONS.filter(opt => isPriceRangeAvailable(opt)).map((option) => {
                const selected = isSelected(option);
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.option,
                      { borderBottomColor: theme.colors.border.light }
                    ]}
                    onPress={() => handleSelect(option)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: theme.colors.text.primary }
                    ]}>
                      {option.label}
                    </Text>
                    {selected && (
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={theme.colors.primary[500]} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 80,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContainer: {
    padding: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
});
