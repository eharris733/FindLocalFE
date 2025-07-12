import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet 
} from 'react-native';
import type { EventFilters, FilterAction } from '../types/events';

interface FilterControlsProps {
  filters: EventFilters;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search events..."
        value={filters.searchText}
        onChangeText={(text) => 
          dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: text })
        }
      />
      
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {availableCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              filters.category === category && styles.filterChipActive
            ]}
            onPress={() => 
              dispatchFilters({ type: 'SET_CATEGORY', payload: category })
            }
          >
            <Text style={[
              styles.filterChipText,
              filters.category === category && styles.filterChipTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Text style={styles.sectionTitle}>Venues</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {availableLocations.map((location) => (
          <TouchableOpacity
            key={location}
            style={[
              styles.filterChip,
              filters.venue === location && styles.filterChipActive
            ]}
            onPress={() => 
              dispatchFilters({ type: 'SET_LOCATION', payload: location })
            }
          >
            <Text style={[
              styles.filterChipText,
              filters.venue === location && styles.filterChipTextActive
            ]}>
              {location}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => dispatchFilters({ type: 'RESET_FILTERS' })}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  scrollView: {
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#006B5E',
    borderColor: '#006B5E',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterControls;
