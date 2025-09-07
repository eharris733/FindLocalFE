import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { ViewToggle } from './ViewToggle';
import { DateRangePicker } from './DateRangePicker';
import {useCityLocation} from "../../hooks/useCityLocation";
import {FilterDropdown} from "./FilterDropdown";

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
}) => {
  const [openDropdown, setOpenDropdown] = useState<'price' | 'size' | null>(null);

  const priceOptions = ['All prices']; // Only allow "All prices" until real price data is available
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
            disabled={true}
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
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  spacer: {
    flex: 1,
  },
  resultsRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  resultsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  resultsText: {
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 4,
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
