import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { ViewToggle } from './ViewToggle';
import { DateRangePicker } from './DateRangePicker';

interface FilterDropdownProps {
  label: string;
  selectedValue: string;
  options: string[];
  onValueChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  icon?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  selectedValue,
  options,
  onValueChange,
  isOpen,
  onToggle,
  icon,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          {
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.light,
          }
        ]}
        onPress={onToggle}
      >
        <View style={styles.buttonContent}>
          {icon && (
            <Text variant="body2" style={styles.icon}>
              {icon}
            </Text>
          )}
          <Text variant="body2" color="primary" style={styles.dropdownText}>
            {selectedValue}
          </Text>
        </View>
        <Text variant="body2" color="secondary" style={styles.arrow}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={[
          styles.dropdown,
          {
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.light,
            ...theme.shadows.medium,
          }
        ]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                {
                  backgroundColor: option === selectedValue 
                    ? theme.colors.primary[50] 
                    : 'transparent',
                }
              ]}
              onPress={() => {
                onValueChange(option);
                onToggle(); // Close the dropdown
              }}
            >
              <Text 
                variant="body2" 
                color={option === selectedValue ? 'primary' : 'secondary'}
                style={{ fontWeight: option === selectedValue ? '600' : '400' }}
              >
                {option}
              </Text>
              {option === selectedValue && (
                <Text variant="body2" color="primary">✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface FilterRowProps {
  selectedDateRange: DateRange;
  selectedPrice: string;
  selectedSize: string;
  onDateRangeChange: (range: DateRange) => void;
  onPriceChange: (price: string) => void;
  onSizeChange: (size: string) => void;
  resultsCount?: number;
  viewMode?: 'list' | 'map';
  onViewModeChange?: (mode: 'list' | 'map') => void;
}

export const FilterRow: React.FC<FilterRowProps> = ({
  selectedDateRange,
  selectedPrice,
  selectedSize,
  onDateRangeChange,
  onPriceChange,
  onSizeChange,
  resultsCount,
  viewMode = 'list',
  onViewModeChange,
}) => {
  const { theme } = useTheme();
  const [openDropdown, setOpenDropdown] = useState<'price' | 'size' | null>(null);

  const priceOptions = ['All prices', 'Free', '$1-$25', '$25-$50', '$50-$100', '$100+'];
  const sizeOptions = ['All sizes', 'Small (< 50)', 'Medium (50-200)', 'Large (200+)'];

  const handleDropdownToggle = (dropdown: 'price' | 'size') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Close dropdown when clicking outside
  const handleBackdropPress = () => {
    setOpenDropdown(null);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.filterRow}>
          <DateRangePicker
            value={selectedDateRange}
            onChange={onDateRangeChange}
          />
          <FilterDropdown
            label="Price"
            selectedValue={selectedPrice}
            options={priceOptions}
            onValueChange={onPriceChange}
            isOpen={openDropdown === 'price'}
            onToggle={() => handleDropdownToggle('price')}
            icon="💰"
          />
          <FilterDropdown
            label="Size"
            selectedValue={selectedSize}
            options={sizeOptions}
            onValueChange={onSizeChange}
            isOpen={openDropdown === 'size'}
            onToggle={() => handleDropdownToggle('size')}
            icon="🏢"
          />
          
          {resultsCount !== undefined && (
            <View style={styles.resultsContainer}>
              <Text 
                variant="body2" 
                color="primary" 
                style={[styles.resultsText, { color: theme.colors.primary[600] }]}
              >
                {resultsCount} events found
              </Text>
            </View>
          )}
          
          {onViewModeChange && (
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          )}
        </View>
      </View>
      
      {/* Backdrop to close dropdown when clicking outside */}
      {openDropdown && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'relative',
    zIndex: 1000,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownContainer: {
    position: 'relative',
    minWidth: 120,
    zIndex: 1001,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 120,
  },
  dropdownText: {
    marginRight: 4,
    fontSize: 13,
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 6,
    fontSize: 14,
  },
  arrow: {
    fontSize: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    maxHeight: 200,
    zIndex: 1002,
    elevation: 8,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  resultsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resultsText: {
    fontWeight: '500',
    fontSize: 13,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
