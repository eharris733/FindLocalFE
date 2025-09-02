import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { getAvailableCities } from '../../api/events';

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
  const [availableCitiesFromDB, setAvailableCitiesFromDB] = useState<string[]>([]);

  // Load cities from database on component mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);
        const availableCities = await getAvailableCities();
        console.log('Available cities with events:', availableCities);
        console.log('Individual cities:', availableCities.map((city, index) => `${index}: "${city}"`));
        
        // Store available cities for neighborhood checking
        setAvailableCitiesFromDB(availableCities);
        
        // Helper function to check if a city has venues (case-insensitive and neighborhood mapping)
        const cityHasVenues = (cityName: string, neighborhoods?: string[]) => {
          // Check exact match (case-insensitive)
          const exactMatch = availableCities.some(city => city.toLowerCase() === cityName.toLowerCase());
          console.log(`Checking ${cityName}: exact match = ${exactMatch}`);
          
          if (exactMatch) {
            return true;
          }
          
          // Check if any neighborhoods have venues
          if (neighborhoods) {
            const neighborhoodMatch = neighborhoods.some(neighborhood => {
              const match = availableCities.some(city => city.toLowerCase() === neighborhood.toLowerCase());
              if (match) {
                console.log(`${cityName}: found match for neighborhood ${neighborhood}`);
              }
              return match;
            });
            console.log(`${cityName}: neighborhood match = ${neighborhoodMatch}`);
            return neighborhoodMatch;
          }
          
          return false;
        };
        
        // Hardcoded city data with neighborhoods - merge with database data
        const cityData: CityData[] = [
          {
            name: 'New York',
            neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
            hasVenues: cityHasVenues('New York', ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'])
          },
          {
            name: 'Boston',
            neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'],
            hasVenues: cityHasVenues('Boston', ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'])
          },
          {
            name: 'Los Angeles',
            neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'],
            hasVenues: cityHasVenues('Los Angeles', ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'])
          },
          {
            name: 'Chicago',
            neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'],
            hasVenues: cityHasVenues('Chicago', ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'])
          },
          {
            name: 'San Francisco',
            neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'],
            hasVenues: cityHasVenues('San Francisco', ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'])
          },
          {
            name: 'Seattle',
            neighborhoods: ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'],
            hasVenues: cityHasVenues('Seattle', ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'])
          },
          {
            name: 'Washington, DC',
            neighborhoods: ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'],
            hasVenues: cityHasVenues('Washington, DC', ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'])
          },
          {
            name: 'Miami',
            neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'],
            hasVenues: cityHasVenues('Miami', ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'])
          },
          {
            name: 'Austin',
            neighborhoods: ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'],
            hasVenues: cityHasVenues('Austin', ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'])
          },
          {
            name: 'Portland',
            neighborhoods: ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'],
            hasVenues: cityHasVenues('Portland', ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'])
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
                      {cityInfo.neighborhoods.map((neighborhood) => {
                        // Check if this specific neighborhood has venues in the database
                        const neighborhoodHasVenues = availableCitiesFromDB.some((city: string) => 
                          city.toLowerCase() === neighborhood.toLowerCase()
                        );
                        
                        return (
                          <TouchableOpacity
                            key={neighborhood}
                            style={[
                              styles.neighborhoodOption,
                              {
                                backgroundColor: isNeighborhoodSelected(neighborhood)
                                  ? theme.colors.primary[50]
                                  : 'transparent',
                                opacity: neighborhoodHasVenues ? 1 : 0.4,
                              }
                            ]}
                            onPress={neighborhoodHasVenues ? () => handleSelection(neighborhood) : undefined}
                            disabled={!neighborhoodHasVenues}
                          >
                            <Text 
                              variant="body1" 
                              color={isNeighborhoodSelected(neighborhood) ? 'primary' : neighborhoodHasVenues ? 'secondary' : 'tertiary'}
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
                        );
                      })}
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
