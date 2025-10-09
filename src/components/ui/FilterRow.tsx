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
  selectedSize: string | string[];
  onDateRangeChange: (range: DateRange) => void;
  onPriceChange: (price: string) => void;
  onSizeChange: (size: string | string[]) => void;
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
  const [showPriceTooltip, setShowPriceTooltip] = useState(false);

  const priceOptions = ['All prices']; // Only allow "All prices" until real price data is available
  const sizeOptions = ['All sizes', 'Small', 'Medium', 'Large'];

  const handleDropdownToggle = (dropdown: 'price' | 'size') => {
    if (dropdown === 'price') {
      // Show tooltip for price dropdown
      setShowPriceTooltip(true);
      setTimeout(() => setShowPriceTooltip(false), 2000);
      return;
    }
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
          <View style={{ position: 'relative' }}>
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
            {showPriceTooltip && (
              <View style={[styles.tooltip, {
                backgroundColor: '#333',
                borderRadius: 6,
                padding: 8,
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: [{ translateX: -50 }],
                zIndex: 1000,
                minWidth: 120,
              }]}>
                <Text style={[styles.tooltipText, {
                  color: 'white',
                  fontSize: 12,
                  textAlign: 'center',
                }]}>
                  Coming soon!
                </Text>
                <View style={[styles.tooltipArrow, {
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: [{ translateX: -6 }],
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#333',
                }]} />
              </View>
            )}
          </View>
          <FilterDropdown
            label="Size"
            selectedValue={selectedSize}
            options={sizeOptions}
            onValueChange={onSizeChange}
            isOpen={openDropdown === 'size'}
            onToggle={() => handleDropdownToggle('size')}
            icon="🏢"
            keepOpen={true}
            multiSelect={true}
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
  tooltip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    fontWeight: '500',
  },
  tooltipArrow: {},
});
