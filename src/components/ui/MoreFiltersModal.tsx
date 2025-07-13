import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text, Button, SearchableDropdown } from './';
import type { FilterState, FilterAction } from '../../hooks/useEvents';

interface MoreFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

export const MoreFiltersModal: React.FC<MoreFiltersModalProps> = ({
  visible,
  onClose,
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
}) => {
  const { theme } = useTheme();

  const clearAllFilters = () => {
    dispatchFilters({ type: 'CLEAR_ALL' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
          <Text variant="h2">More Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Text variant="h3" color="secondary">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Venue Selection */}
          <View style={styles.section}>
            <SearchableDropdown
              label="Venue"
              data={availableLocations}
              value={filters.location}
              onSelect={(value) => dispatchFilters({ type: 'SET_LOCATION', payload: value })}
              placeholder="Search venues..."
              minWidth={200}
              maxWidth={400}
            />
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryGrid}>
              {availableCategories.map((category) => (
                <Button
                  key={category}
                  variant={filters.category === category ? 'primary' : 'outline'}
                  size="small"
                  title={category === 'all' ? 'All Categories' : category}
                  onPress={() => dispatchFilters({ type: 'SET_CATEGORY', payload: category })}
                  style={styles.categoryButton}
                />
              ))}
            </View>
          </View>

          {/* Clear All */}
          <View style={styles.section}>
            <Button
              variant="secondary"
              title="Clear All Filters"
              onPress={clearAllFilters}
              style={styles.clearButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    marginBottom: 8,
  },
  clearButton: {
    alignSelf: 'center',
  },
});