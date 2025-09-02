import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface CityData {
  name: string;
  neighborhoods?: string[];
}

interface CityPickerProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
}

export const CityPicker: React.FC<CityPickerProps> = ({
  selectedCity,
  onCityChange,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  // Hierarchical city data with neighborhoods
  const cityData: CityData[] = [
    {
      name: 'New York',
      neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
    },
    {
      name: 'Boston',
      neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway']
    },
    {
      name: 'Los Angeles',
      neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood']
    },
    {
      name: 'Chicago',
      neighborhoods: ['River North', 'Lincoln Park', 'Wicker Park', 'Logan Square', 'The Loop']
    },
    {
      name: 'San Francisco',
      neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Nob Hill', 'Marina']
    },
  ];

  const toggleCityExpansion = (cityName: string) => {
    const newExpanded = new Set(expandedCities);
    if (newExpanded.has(cityName)) {
      newExpanded.delete(cityName);
    } else {
      newExpanded.add(cityName);
    }
    setExpandedCities(newExpanded);
  };

  const handleSelection = (selection: string) => {
    onCityChange(selection);
    setIsOpen(false);
    setExpandedCities(new Set()); // Reset expanded state
  };

  const isMainCitySelected = (cityName: string) => {
    return selectedCity === cityName;
  };

  const isNeighborhoodSelected = (neighborhood: string) => {
    return selectedCity === neighborhood;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }
        ]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.locationRow}>
          <Text variant="body1" color="primary" style={styles.locationIcon}>
            🧐
          </Text>
          <Text variant="h3" color="primary" style={styles.locationText}>
            Events Near{' '}
            <Text variant="h3" style={{ fontWeight: '700', color: theme.colors.text.primary }}>
              {selectedCity}
            </Text>
          </Text>
          <Text variant="body2" color="secondary" style={styles.arrow}>
            ▼
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: theme.colors.background.primary,
            }
          ]}>
            {/* Header */}
            <View style={[
              styles.modalHeader,
              { borderBottomColor: theme.colors.border.light }
            ]}>
              <Text variant="h2" color="primary" style={styles.modalTitle}>
                Select Location
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            {/* City List */}
            <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
              {cityData.map((cityInfo) => (
                <View key={cityInfo.name}>
                  {/* Main City Row */}
                  <View style={styles.cityRow}>
                    <TouchableOpacity
                      style={[
                        styles.cityOption,
                        {
                          backgroundColor: isMainCitySelected(cityInfo.name)
                            ? theme.colors.primary[50]
                            : 'transparent',
                        }
                      ]}
                      onPress={() => handleSelection(cityInfo.name)}
                    >
                      <Text 
                        variant="h4" 
                        color={isMainCitySelected(cityInfo.name) ? 'primary' : 'secondary'}
                        style={{ 
                          fontWeight: isMainCitySelected(cityInfo.name) ? '700' : '600',
                        }}
                      >
                        {cityInfo.name}
                      </Text>
                      {isMainCitySelected(cityInfo.name) && (
                        <Text variant="body1" color="primary">✓</Text>
                      )}
                    </TouchableOpacity>
                    
                    {/* Expand/Collapse Button */}
                    {cityInfo.neighborhoods && (
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleCityExpansion(cityInfo.name)}
                      >
                        <Text variant="body1" color="secondary">
                          {expandedCities.has(cityInfo.name) ? '−' : '+'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Neighborhoods (if expanded) */}
                  {expandedCities.has(cityInfo.name) && cityInfo.neighborhoods && (
                    <View style={styles.neighborhoodSection}>
                      {cityInfo.neighborhoods.map((neighborhood) => (
                        <TouchableOpacity
                          key={neighborhood}
                          style={[
                            styles.neighborhoodOption,
                            {
                              backgroundColor: isNeighborhoodSelected(neighborhood)
                                ? theme.colors.primary[50]
                                : 'transparent',
                            }
                          ]}
                          onPress={() => handleSelection(neighborhood)}
                        >
                          <Text 
                            variant="body1" 
                            color={isNeighborhoodSelected(neighborhood) ? 'primary' : 'secondary'}
                            style={{ 
                              fontWeight: isNeighborhoodSelected(neighborhood) ? '600' : '400',
                              marginLeft: 20,
                            }}
                          >
                            {neighborhood}
                          </Text>
                          {isNeighborhoodSelected(neighborhood) && (
                            <Text variant="body1" color="primary">✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    zIndex: 1000,
  },
  picker: {
    paddingVertical: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 8,
    fontSize: 18,
  },
  locationText: {
    fontSize: 20,
    marginRight: 8,
  },
  arrow: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  cityList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  expandButton: {
    padding: 12,
    marginLeft: 8,
  },
  neighborhoodSection: {
    marginLeft: 16,
    marginBottom: 8,
  },
  neighborhoodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
  },
});
