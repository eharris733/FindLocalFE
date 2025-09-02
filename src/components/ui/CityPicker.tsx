import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { getAvailableCities } from '../../api/venues';

interface CityData {
  name: string;
  neighborhoods?: string[];
  hasVenues?: boolean;
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
  const [loading, setLoading] = useState(true);
  const [allCityData, setAllCityData] = useState<CityData[]>([]);

  // Load cities from database on component mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);
        const availableCities = await getAvailableCities();
        
        // Hardcoded city data with neighborhoods - merge with database data
        const cityData: CityData[] = [
          {
            name: 'New York',
            neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
            hasVenues: availableCities.includes('New York')
          },
          {
            name: 'Boston',
            neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'],
            hasVenues: availableCities.includes('Boston')
          },
          {
            name: 'Los Angeles',
            neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'],
            hasVenues: availableCities.includes('Los Angeles')
          },
          {
            name: 'Chicago',
            neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'],
            hasVenues: availableCities.includes('Chicago')
          },
          {
            name: 'San Francisco',
            neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'],
            hasVenues: availableCities.includes('San Francisco')
          },
          {
            name: 'Seattle',
            neighborhoods: ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'],
            hasVenues: availableCities.includes('Seattle')
          },
          {
            name: 'Washington, DC',
            neighborhoods: ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'],
            hasVenues: availableCities.includes('Washington, DC')
          },
          {
            name: 'Miami',
            neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'],
            hasVenues: availableCities.includes('Miami')
          },
          {
            name: 'Austin',
            neighborhoods: ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'],
            hasVenues: availableCities.includes('Austin')
          },
          {
            name: 'Portland',
            neighborhoods: ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'],
            hasVenues: availableCities.includes('Portland')
          }
        ];
        
        setAllCityData(cityData);
      } catch (error) {
        console.error('Error loading cities:', error);
        // Fallback to cities without hasVenues data
        setAllCityData([
          { name: 'New York', neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'], hasVenues: false },
          { name: 'Boston', neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'], hasVenues: false },
          { name: 'Los Angeles', neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'], hasVenues: false },
          { name: 'Chicago', neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'], hasVenues: false },
          { name: 'San Francisco', neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'], hasVenues: false },
          { name: 'Seattle', neighborhoods: ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'], hasVenues: false },
          { name: 'Washington, DC', neighborhoods: ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'], hasVenues: false },
          { name: 'Miami', neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'], hasVenues: false },
          { name: 'Austin', neighborhoods: ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'], hasVenues: false },
          { name: 'Portland', neighborhoods: ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'], hasVenues: false }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, []);

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
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                  <Text variant="body1" color="secondary" style={styles.loadingText}>
                    Loading cities...
                  </Text>
                </View>
              ) : (
                allCityData.map((cityInfo) => (
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
                            opacity: cityInfo.hasVenues ? 1 : 0.4,
                          }
                        ]}
                        onPress={cityInfo.hasVenues ? () => handleSelection(cityInfo.name) : undefined}
                        disabled={!cityInfo.hasVenues}
                      >
                      <Text 
                        variant="h4" 
                        color={isMainCitySelected(cityInfo.name) ? 'primary' : cityInfo.hasVenues ? 'secondary' : 'tertiary'}
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
                    {cityInfo.neighborhoods && cityInfo.neighborhoods.length > 0 && cityInfo.hasVenues && (
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
              ))
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
  },
});
