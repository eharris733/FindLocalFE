import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isAfter,
  isBefore,
  isWithinInterval
} from 'date-fns';

interface CalendarProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateSelect: (date: Date) => void;
  onRangeComplete: (start: Date, end: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  startDate,
  endDate,
  onDateSelect,
  onRangeComplete,
}) => {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate_cal = startOfWeek(monthStart);
  const endDate_cal = endOfWeek(monthEnd);

  const handleDateClick = (date: Date) => {
    if (!startDate || !selectingStart) {
      // Select start date
      onDateSelect(date);
      setSelectingStart(false);
    } else {
      // Select end date
      if (isAfter(date, startDate) || isSameDay(date, startDate)) {
        onRangeComplete(startDate, date);
      } else {
        // If selected date is before start, make it the new start
        onDateSelect(date);
        setSelectingStart(false);
      }
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
      <TouchableOpacity 
        onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
        style={styles.navButton}
      >
        <Text variant="body1" color="primary">‹</Text>
      </TouchableOpacity>
      
      <Text variant="h4" color="primary">
        {format(currentMonth, 'MMMM yyyy')}
      </Text>
      
      <TouchableOpacity 
        onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
        style={styles.navButton}
      >
        <Text variant="body1" color="primary">›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDaysOfWeek = () => (
    <View style={styles.daysRow}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <View key={day} style={styles.dayHeader}>
          <Text variant="caption" color="secondary" style={styles.dayHeaderText}>
            {day}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCalendarDays = () => {
    const days = [];
    let day = startDate_cal;

    while (day <= endDate_cal) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isSelected = (startDate && isSameDay(currentDay, startDate)) || 
                          (endDate && isSameDay(currentDay, endDate));
        const isInRange = startDate && endDate && 
                         isWithinInterval(currentDay, { start: startDate, end: endDate });
        const isToday = isSameDay(currentDay, new Date());

        week.push(
          <TouchableOpacity
            key={currentDay.toString()}
            style={[
              styles.dayButton,
              !isCurrentMonth && { opacity: 0.3 },
              isSelected && { backgroundColor: theme.colors.primary[500] },
              isInRange && !isSelected && { backgroundColor: theme.colors.primary[100] },
              isToday && !isSelected && { borderColor: theme.colors.primary[500], borderWidth: 1 },
            ]}
            onPress={() => isCurrentMonth && handleDateClick(currentDay)}
            disabled={!isCurrentMonth}
          >
            <Text 
              variant="body2" 
              color={isSelected ? 'inverse' : 'primary'}
              style={[
                styles.dayText,
                !isCurrentMonth && { color: theme.colors.text.tertiary },
              ]}
            >
              {format(currentDay, 'd')}
            </Text>
          </TouchableOpacity>
        );
        day = addDays(day, 1);
      }
      days.push(
        <View key={day.toString()} style={styles.week}>
          {week}
        </View>
      );
    }
    return days;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {renderHeader()}
      {renderDaysOfWeek()}
      <View style={styles.calendar}>
        {renderCalendarDays()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  dayHeader: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendar: {
    padding: 8,
  },
  week: {
    flexDirection: 'row',
  },
  dayButton: {
    flex: 1,
    height: 32,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  dayText: {
    fontWeight: '500',
  },
});