import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { Portal } from './Portal';
import { Calendar } from './Calendar';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  disabled?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<View>(null);

  const quickOptions = [
    { 
      label: 'Today', 
      getValue: () => ({ start: new Date(), end: new Date() })
    },
    { 
      label: 'Tomorrow', 
      getValue: () => {
        const tomorrow = addDays(new Date(), 1);
        return { start: tomorrow, end: tomorrow };
      }
    },
    { 
      label: 'Week', 
      getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })
    },
  ];

  const formatDisplayValue = () => {
    if (!value.start && !value.end) return 'Select dates';
    if (value.start && !value.end) return format(value.start, 'MMM dd');
    if (value.start && value.end) {
      if (value.start.getTime() === value.end.getTime()) {
        return format(value.start, 'MMM dd, yyyy');
      }
      return `${format(value.start, 'MMM dd')} - ${format(value.end, 'MMM dd')}`;
    }
    return 'Select dates';
  };

  const handleQuickSelect = (option: any) => {
    const range = option.getValue();
    onChange(range);
    setIsOpen(false);
    setTempStart(null);
    setSelectingEnd(false);
  };

  const handleDateSelect = (date: Date) => {
    if (!tempStart && !selectingEnd) {
      // Starting a new selection
      setTempStart(date);
      setSelectingEnd(true);
    } else if (tempStart && selectingEnd) {
      // Completing a range
      if (date.getTime() === tempStart.getTime()) {
        // Same date selected, treat as single day
        onChange({ start: date, end: date });
        setTempStart(null);
        setSelectingEnd(false);
      } else if (date > tempStart) {
        // Valid range with end after start
        onChange({ start: tempStart, end: date });
        setTempStart(null);
        setSelectingEnd(false);
      } else {
        // Date before current start, make it the new start
        setTempStart(date);
        setSelectingEnd(true);
      }
    } else {
      // Handle existing range selection
      if (value.start && value.end) {
        // Check if clicked date is within existing range
        if (date >= value.start && date <= value.end) {
          // Update end date
          if (date.getTime() === value.start.getTime()) {
            // Clicked on start date, treat as single day
            onChange({ start: date, end: date });
          } else {
            onChange({ start: value.start, end: date });
          }
          setTempStart(null);
          setSelectingEnd(false);
        } else {
          // Date outside range, start new selection
          setTempStart(date);
          setSelectingEnd(true);
        }
      } else {
        // No existing range, start new selection
        setTempStart(date);
        setSelectingEnd(true);
      }
    }
  };

  const handleRangeComplete = (start: Date, end: Date) => {
    onChange({ start, end });
    setTempStart(null);
    setSelectingEnd(false);
  };

  const handleOpen = () => {
    if (!disabled) {
      // Measure container position before opening to prevent flash
      if (containerRef.current) {
        containerRef.current.measureInWindow((x, y, width, height) => {
          setDropdownLayout({ x, y: y + height, width, height });
          setIsOpen(true);
          setTempStart(null);
          setSelectingEnd(false);
        });
      } else {
        setIsOpen(true);
        setTempStart(null);
        setSelectingEnd(false);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTempStart(null);
    setSelectingEnd(false);
  };

  // Native date picker for mobile
  if (Platform.OS !== 'web') {
    return (
      <>
        <View ref={containerRef} style={[styles.container, { minWidth: 120 }]}>
          {label && (
            <Text variant="caption" color="secondary" style={styles.label}>
              {label.toUpperCase()}
            </Text>
          )}
          
          <TouchableOpacity
            style={[{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border.light,
              backgroundColor: theme.colors.background.secondary,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              minWidth: 160,
              height: 36,
            }, disabled && { opacity: 0.5 }]}
            onPress={handleOpen}
            disabled={disabled}
          >
            <Text variant="body2" style={{ marginRight: 6, fontSize: 14 }}>
              📅
            </Text>
            <Text 
              variant="body2" 
              color="primary"
              numberOfLines={1}
              style={{ flex: 1, fontSize: 14 }}
            >
              {formatDisplayValue()}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={isOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleClose}
        >
          <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.background.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.light }]}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={handleClose}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {quickOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.quickButton, {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.light,
                    marginBottom: 8,
                  }]}
                  onPress={() => handleQuickSelect(option)}
                >
                  <Text variant="body1">
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // Web implementation with calendar portal
  return (
    <>
      <View ref={containerRef} style={[styles.container, { minWidth: 120 }]}>
        {label && (
          <Text variant="caption" color="secondary" style={styles.label}>
            {label.toUpperCase()}
          </Text>
        )}
        
        <TouchableOpacity
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: isOpen ? theme.colors.primary[500] : theme.colors.border.light,
              borderRadius: theme.borderRadius.md,
              height: 36,
            },
            disabled && { opacity: 0.5 }
          ]}
          onPress={handleOpen}
          disabled={disabled}
        >
          <Text variant="body2" style={{ marginRight: 6, fontSize: 14 }}>
            📅
          </Text>
          <Text 
            variant="body2" 
            color="primary"
            numberOfLines={1}
            style={styles.inputText}
          >
            {formatDisplayValue()}
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <Portal>
          <TouchableOpacity 
            style={styles.backdrop} 
            activeOpacity={1} 
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
                  ...theme.shadows.large,
                  zIndex: 9999,
                }
              ]}
              onStartShouldSetResponder={() => true}
            >
              {/* Quick Select Buttons with Close Button */}
              <View style={[styles.quickSelectContainer, { 
                borderBottomColor: theme.colors.border.light,
                padding: 16,
              }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.quickGrid}>
                    {quickOptions.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={[styles.quickChip, {
                          backgroundColor: theme.colors.background.primary,
                          borderColor: theme.colors.border.light,
                        }]}
                        onPress={() => handleQuickSelect(option)}
                      >
                        <Text variant="caption">
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
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

              {/* Calendar */}
              <View style={{ padding: 16 }}>
                <Calendar
                  startDate={tempStart || value.start}
                  endDate={selectingEnd ? null : value.end}
                  onDateSelect={handleDateSelect}
                  onRangeComplete={handleRangeComplete}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Portal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputText: {
    flex: 1,
  },
  arrow: {
    marginLeft: 8,
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
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
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
    borderRadius: 6,
  },
  
  // Mobile styles
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
});