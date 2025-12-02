import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { Calendar } from './Calendar';
import { Portal } from './Portal';
import { format, addDays, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface WhenDropdownProps {
  selectedOption: 'all' | 'today' | 'tomorrow' | 'this_week' | 'custom';
  customDateRange?: DateRange;
  onOptionChange: (option: 'all' | 'today' | 'tomorrow' | 'this_week' | 'custom') => void;
  onCustomDateChange?: (range: DateRange) => void;
}

const whenOptions = [
  { id: 'all' as const, label: 'All', emoji: '📅' },
  { id: 'today' as const, label: 'Today', emoji: '📅' },
  { id: 'tomorrow' as const, label: 'Tomorrow', emoji: '📆' },
  { id: 'this_week' as const, label: 'This Week', emoji: '📋' },
  { id: 'custom' as const, label: 'Custom Date', emoji: '🗓️' },
];

export const WhenDropdown: React.FC<WhenDropdownProps> = ({
  selectedOption,
  customDateRange,
  onOptionChange,
  onCustomDateChange,
}) => {
  const { theme } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<View>(null);

  const quickOptions = [
    { 
      id: 'today' as const,
      label: 'Today', 
      getValue: () => {
        const today = new Date();
        return { start: startOfDay(today), end: endOfDay(today) };
      }
    },
    { 
      id: 'tomorrow' as const,
      label: 'Tomorrow', 
      getValue: () => {
        const tomorrow = addDays(new Date(), 1);
        return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
      }
    },
    { 
      id: 'this_week' as const,
      label: 'Week', 
      getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })
    },
    { 
      id: 'all' as const,
      label: 'All', 
      getValue: () => {
        const today = new Date();
        return { start: startOfDay(today), end: endOfDay(addDays(today, 365)) };
      }
    },
  ];

  const handleQuickSelect = (option: any) => {
    const range = option.getValue();
    onCustomDateChange?.(range);
    onOptionChange(option.id); // Use the option's id instead of always 'custom'
    setShowDatePicker(false);
    setTempStart(null);
    setSelectingEnd(false);
  };

  const handleDateSelect = (date: Date) => {
    if (!tempStart && !selectingEnd) {
      // First click - set start date, don't close
      setTempStart(date);
      setSelectingEnd(true);
    } else if (tempStart && selectingEnd) {
      // Second click - complete the range
      if (date.getTime() === tempStart.getTime()) {
        // Same date selected - treat as single day
        const range = { start: startOfDay(date), end: endOfDay(date) };
        onCustomDateChange?.(range);
        onOptionChange('custom');
        setShowDatePicker(false);
        setTempStart(null);
        setSelectingEnd(false);
      } else if (date > tempStart) {
        // Valid range - close after selection
        // Ensure we use start of day for start date and end of day for end date
        const range = { start: startOfDay(tempStart), end: endOfDay(date) };
        onCustomDateChange?.(range);
        onOptionChange('custom');
        setShowDatePicker(false);
        setTempStart(null);
        setSelectingEnd(false);
      } else {
        // Date before start - make it the new start, keep picker open
        setTempStart(date);
        setSelectingEnd(true);
      }
    } else {
      // Starting a new selection
      setTempStart(date);
      setSelectingEnd(true);
    }
  };

  const handleRangeComplete = (start: Date, end: Date) => {
    const range = { start, end };
    onCustomDateChange?.(range);
    onOptionChange('custom');
    setShowDatePicker(false);
    setTempStart(null);
    setSelectingEnd(false);
  };

  const handleClose = () => {
    setShowDatePicker(false);
    setTempStart(null);
    setSelectingEnd(false);
  };

  const handleOpen = () => {
    if (containerRef.current) {
      containerRef.current.measureInWindow((x, y, width, height) => {
        setDropdownLayout({ x, y: y + height, width, height });
        setShowDatePicker(true);
        setTempStart(null);
        setSelectingEnd(false);
      });
    } else {
      setShowDatePicker(true);
      setTempStart(null);
      setSelectingEnd(false);
    }
  };

  const formatDisplayValue = () => {
    // If a preset option is selected (today, tomorrow, this_week), show its label
    if (selectedOption !== 'custom') {
      return whenOptions.find(opt => opt.id === selectedOption)?.label || 'Select';
    }
    
    // Otherwise, show the custom date range
    if (customDateRange?.start && customDateRange?.end) {
      return `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd')}`;
    }
    if (customDateRange?.start) {
      return format(customDateRange.start, 'MMM dd');
    }
    return 'Select';
  };

  // Mobile implementation
  if (Platform.OS !== 'web') {
    return (
      <>
        <View style={styles.container}>
          <Text variant="caption" color="tertiary" style={styles.label}>
            WHEN
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.border.light,
              }
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text variant="body2" color="primary" style={styles.buttonText}>
              {formatDisplayValue()}
            </Text>
            <Text variant="body2" color="secondary" style={{ fontSize: 14 }}>▼</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showDatePicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleClose}
        >
          <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.background.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.light }]}>
              <Text variant="h3" color="primary">Select Date</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {quickOptions.map((option) => {
                const isSelected = selectedOption === option.id;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[styles.quickButton, {
                      backgroundColor: isSelected ? theme.colors.primary[500] : theme.colors.background.secondary,
                      borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border.light,
                      marginBottom: 12,
                    }]}
                    onPress={() => handleQuickSelect(option)}
                  >
                    <Text 
                      variant="body1"
                      style={{
                        color: isSelected ? '#FFFFFF' : theme.colors.text.primary,
                        fontWeight: isSelected ? '600' : '400'
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // Web implementation
  return (
    <>
      <View ref={containerRef} style={styles.container}>
        <Text variant="caption" color="tertiary" style={styles.label}>
          WHEN
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: showDatePicker ? theme.colors.primary[500] : theme.colors.border.light,
            }
          ]}
          onPress={handleOpen}
        >
          <Text variant="body2" color="primary" style={styles.buttonText}>
            {formatDisplayValue()}
          </Text>
          <Text variant="body2" color="secondary" style={{ fontSize: 14 }}>▼</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <Portal>
          <Pressable 
            style={styles.backdrop}
            onPress={handleClose}
          >
            <View
              style={[
                styles.dropdown,
                {
                  position: 'absolute',
                  top: dropdownLayout.y + 8,
                  left: Math.max(16, dropdownLayout.x - 100),
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.primary[500],
                }
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.quickSelectContainer, { 
                borderBottomColor: theme.colors.border.light,
                padding: 16,
              }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.quickGrid}>
                    {quickOptions.map((option) => {
                      const isSelected = selectedOption === option.id;
                      return (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.quickChip,
                            {
                              backgroundColor: isSelected ? theme.colors.primary[500] : theme.colors.background.primary,
                              borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border.light,
                            }
                          ]}
                          onPress={() => handleQuickSelect(option)}
                        >
                          <Text 
                            variant="caption"
                            style={{ 
                              color: isSelected ? '#FFFFFF' : theme.colors.text.primary,
                              fontWeight: isSelected ? '600' : '400'
                            }}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={handleClose}
                  >
                    <Text variant="body1" color="secondary" style={{ fontSize: 18, fontWeight: 'bold' }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ padding: 16 }}>
                <Calendar
                  startDate={tempStart || customDateRange?.start || null}
                  endDate={selectingEnd ? null : customDateRange?.end || null}
                  onDateSelect={handleDateSelect}
                  onRangeComplete={handleRangeComplete}
                />
              </View>
            </View>
          </Pressable>
        </Portal>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
  },
  buttonText: {
    fontWeight: '500',
    marginRight: 4,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  quickSelectContainer: {
    borderBottomWidth: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalContent: {
    padding: 16,
  },
  quickButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
  },
});
