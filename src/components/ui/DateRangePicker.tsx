import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { Portal } from './Portal';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const presets = [
    { 
      label: 'Today', 
      emoji: '🔥',
      getValue: () => ({ start: new Date(), end: new Date() })
    },
    { 
      label: 'Tomorrow', 
      emoji: '⏰',
      getValue: () => {
        const tomorrow = addDays(new Date(), 1);
        return { start: tomorrow, end: tomorrow };
      }
    },
    { 
      label: 'This Week', 
      emoji: '📆',
      getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })
    },
    { 
      label: 'This Month', 
      emoji: '🗓️',
      getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
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

  const handlePresetSelect = (preset: any) => {
    const range = preset.getValue();
    onChange(range);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ start: null, end: null });
    setIsOpen(false);
  };

  const handleOpen = () => {
    if (!disabled) {
      setTempRange(value);
      setIsOpen(true);
    }
  };

  if (Platform.OS !== 'web') {
    // On mobile, use native date picker in modal
    return (
      <>
        <View style={[styles.container, { minWidth: 160 }]}>
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
                borderColor: theme.colors.border.light,
                borderRadius: theme.borderRadius.md,
                height: 44,
              },
              disabled && { opacity: 0.5 }
            ]}
            onPress={handleOpen}
            disabled={disabled}
          >
            <Text 
              variant="body2" 
              color={(!value.start && !value.end) ? 'tertiary' : 'primary'}
              numberOfLines={1}
              style={styles.inputText}
            >
              {formatDisplayValue()}
            </Text>
            <Text variant="body2" color="tertiary" style={styles.arrow}>
              📅
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={isOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsOpen(false)}
        >
          <SafeAreaView style={[styles.modal, { backgroundColor: theme.colors.background.primary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.light }]}>
              <Text variant="h3">Select Date Range</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text variant="h4" style={{ marginBottom: 16 }}>Quick Select</Text>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetButton, {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.light,
                    marginBottom: 8,
                  }]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text variant="body1">
                    {preset.emoji} {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.clearButton, {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.medium,
                  marginTop: 16,
                }]}
                onPress={handleClear}
              >
                <Text variant="body1" color="secondary">Clear Dates</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // Web implementation with inline calendar
  return (
    <>
      <View style={[styles.container, { minWidth: 160 }]}>
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
              height: 44,
            },
            disabled && { opacity: 0.5 }
          ]}
          onPress={handleOpen}
          disabled={disabled}
        >
          <Text 
            variant="body2" 
            color={(!value.start && !value.end) ? 'tertiary' : 'primary'}
            numberOfLines={1}
            style={styles.inputText}
          >
            {formatDisplayValue()}
          </Text>
          <Text variant="body2" color="tertiary" style={styles.arrow}>
            📅
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <Portal>
          <View
            style={[
              styles.dropdown,
              {
                position: 'absolute',
                top: 100, // Adjust based on your filter bar height
                left: '50%',
                transform: [{ translateX: -200 }],
                width: 400,
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.primary[500],
                ...theme.shadows.large,
                zIndex: 9999,
              }
            ]}
          >
            <View style={[styles.calendarHeader, { 
              borderBottomColor: theme.colors.border.light,
              padding: 16,
            }]}>
              <Text variant="h4">Select Date Range</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text variant="body1" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text variant="body1" style={{ marginBottom: 12, fontWeight: '600' }}>
                Quick Select
              </Text>
              <View style={styles.presetGrid}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.presetChip, {
                      backgroundColor: theme.colors.background.primary,
                      borderColor: theme.colors.border.light,
                    }]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <Text variant="caption">
                      {preset.emoji} {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.clearButton, {
                  backgroundColor: theme.colors.background.primary,
                  borderColor: theme.colors.border.medium,
                  marginTop: 16,
                  alignSelf: 'center',
                }]}
                onPress={handleClear}
              >
                <Text variant="body2" color="secondary">Clear Dates</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
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
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
});