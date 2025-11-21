import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface TimeRange {
  start?: number; // Hour in 24h format
  end?: number;
  label: string;
  emoji: string;
}

const TIME_OPTIONS: TimeRange[] = [
  { label: 'Morning', start: 6, end: 12, emoji: '🌅' },
  { label: 'Afternoon', start: 12, end: 17, emoji: '☀️' },
  { label: 'Evening', start: 17, end: 21, emoji: '🌆' },
  { label: 'Night', start: 21, end: 6, emoji: '🌙' }, // wraps to next day
  { label: 'Any Time', emoji: '🕐' },
];

interface TimeDropdownProps {
  selectedTime?: { start?: number; end?: number };
  availableTimeRanges?: string[];
  onTimeChange: (range?: { start?: number; end?: number }) => void;
}

export const TimeDropdown: React.FC<TimeDropdownProps> = ({
  selectedTime,
  availableTimeRanges,
  onTimeChange,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Helper to check if a time range is available
  const isTimeRangeAvailable = (option: TimeRange): boolean => {
    if (!availableTimeRanges || availableTimeRanges.length === 0) return true;
    if (!option.start && !option.end) return true; // "Any Time" is always available
    
    // Map option to range key
    const label = option.label.toLowerCase();
    return availableTimeRanges.includes(label);
  };

  const getSelectedLabel = () => {
    if (!selectedTime) return 'Time';
    
    const option = TIME_OPTIONS.find(
      opt => opt.start === selectedTime.start && opt.end === selectedTime.end
    );
    return option?.label || 'Time';
  };

  const isSelected = (option: TimeRange) => {
    if (!selectedTime && !option.start && !option.end) return true;
    if (!selectedTime) return false;
    return option.start === selectedTime.start && option.end === selectedTime.end;
  };

  const handleSelect = (option: TimeRange) => {
    if (!option.start && !option.end) {
      onTimeChange(undefined);
    } else {
      onTimeChange({ start: option.start, end: option.end });
    }
    setIsModalVisible(false);
  };

  const hasActiveFilter = selectedTime !== undefined;

  return (
    <>
      <View style={styles.container}>
        <Text variant="caption" color="tertiary" style={styles.label}>
          TIME
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
          <Text style={{ color: hasActiveFilter ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 14 }}>▼</Text>
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
                Filter by Time of Day
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsContainer}>
              {TIME_OPTIONS.map((option) => {
                const selected = isSelected(option);
                const available = isTimeRangeAvailable(option);
                const timeDescription = option.start && option.end 
                  ? `${formatHour(option.start)} - ${formatHour(option.end)}`
                  : null;
                
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.option,
                      { 
                        borderBottomColor: theme.colors.border.light,
                        opacity: available ? 1 : 0.3,
                      }
                    ]}
                    onPress={() => handleSelect(option)}
                    disabled={!available}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      <View>
                        <Text style={[
                          styles.optionText,
                          { color: theme.colors.text.primary }
                        ]}>
                          {option.label}
                        </Text>
                        {timeDescription && (
                          <Text style={[
                            styles.optionDescription,
                            { color: theme.colors.text.secondary }
                          ]}>
                            {timeDescription}
                          </Text>
                        )}
                      </View>
                    </View>
                    {selected && (
                      <Text style={{ color: theme.colors.primary[500], fontSize: 18 }}>✓</Text>
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

const formatHour = (hour: number): string => {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
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
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});
