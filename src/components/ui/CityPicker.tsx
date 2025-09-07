import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { getAvailableCities } from '../../api/events';
import {useCityLocation} from "../../hooks/useCityLocation";

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
  const {loading, allCityData} = useCityLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());


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
          <Image 
            source={require('../../../assets/monocle.png')} 
            style={styles.locationIcon}
          />
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
                        const neighborhoodHasVenues = allCityData.some((city) =>
                          city.name.toLowerCase() === neighborhood.toLowerCase()
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
    width: 20,
    height: 20,
    marginRight: 8,
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
