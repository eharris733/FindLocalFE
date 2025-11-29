import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useCityLocation } from "../../context/CityContext";
import { useCommunity } from '../../context/CommunityContext';

interface CityPickerProps {
  selectedCity: string;
  onCityChange: (city: string) => Promise<void>;
  selectedRegions?: string[]; // Array of selected regions
  onRegionsChange?: (regions: string[]) => void; // Callback for region selection
  initiallyOpen?: boolean; // For external control - opens immediately if true
  showTrigger?: boolean; // Show the trigger button or just the modal
  onClose?: () => void; // Callback when modal is closed
}

export const CityPicker: React.FC<CityPickerProps> = ({
  selectedCity,
  onCityChange,
  selectedRegions = [],
  onRegionsChange,
  initiallyOpen = false,
  showTrigger = true,
  onClose,
}) => {
  const { theme } = useTheme();
  const { loading, allCityData } = useCityLocation();
  const { onCityChange: onCommunityCityChange } = useCommunity();
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const handleSelection = async (selection: string) => {
    await onCityChange(selection);
    // Also update CommunityContext city (triggers label reload)
    await onCommunityCityChange(selection);
    // Clear region selection when city changes
    if (onRegionsChange) {
      onRegionsChange([]);
    }
    // Don't close the modal - let user select regions
  };

  const handleModalClose = () => {
    setIsOpen(false);
    onClose?.(); // Call external close handler if provided
  };

  const isCitySelected = (cityName: string) => {
    return selectedCity === cityName;
  };

  const handleRegionToggle = (region: string) => {
    if (!onRegionsChange) return;

    const currentRegions = selectedRegions || [];
    
    if (currentRegions.includes(region)) {
      // Remove region from selection
      onRegionsChange(currentRegions.filter(r => r !== region));
    } else {
      // Add region to selection
      onRegionsChange([...currentRegions, region]);
    }
  };

  const handleAllRegionsClick = () => {
    if (!onRegionsChange) return;
    // Clear all selections to show all regions
    onRegionsChange([]);
  };

  const isRegionSelected = (region: string) => {
    return selectedRegions?.includes(region) || false;
  };

  const isAllRegionsSelected = () => {
    return !selectedRegions || selectedRegions.length === 0;
  };

  return (
    <View style={styles.container}>
      {showTrigger && (
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
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleModalClose}
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
                Select City
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleModalClose}
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
                  <View key={cityInfo.name} style={styles.citySection}>
                    {/* City Option */}
                    <TouchableOpacity
                      style={[
                        styles.cityOption,
                        {
                          backgroundColor: isCitySelected(cityInfo.name)
                            ? theme.colors.primary[50]
                            : 'transparent',
                        }
                      ]}
                      onPress={() => handleSelection(cityInfo.name)}
                    >
                      <Text 
                        variant="h4" 
                        color={isCitySelected(cityInfo.name) ? 'primary' : 'secondary'}
                        style={{ 
                          fontWeight: isCitySelected(cityInfo.name) ? '700' : '600',
                        }}
                      >
                        {cityInfo.name}
                      </Text>
                      {isCitySelected(cityInfo.name) && (
                        <Text variant="body1" color="primary">✓</Text>
                      )}
                    </TouchableOpacity>

                    {/* Show available regions only for the currently selected city */}
                    {isCitySelected(cityInfo.name) && cityInfo.regions && cityInfo.regions.length > 0 && (
                      <View style={styles.regionSection}>
                        <Text variant="caption" color="tertiary" style={styles.regionHeader}>
                          Filter by Region (tap to select):
                        </Text>
                        <View style={styles.regionChips}>
                          {/* "All" pill */}
                          <TouchableOpacity
                            style={[
                              styles.regionChip,
                              { 
                                backgroundColor: isAllRegionsSelected()
                                  ? theme.colors.primary[500]
                                  : theme.colors.background.secondary,
                                borderColor: isAllRegionsSelected()
                                  ? theme.colors.primary[500]
                                  : theme.colors.border.light,
                              }
                            ]}
                            onPress={handleAllRegionsClick}
                          >
                            <Text 
                              variant="caption" 
                              color={isAllRegionsSelected() ? 'inverse' : 'secondary'}
                              style={{ fontWeight: isAllRegionsSelected() ? '600' : '400' }}
                            >
                              All
                            </Text>
                          </TouchableOpacity>
                          
                          {cityInfo.regions.map((region) => {
                            const isSelected = isRegionSelected(region);
                            
                            return (
                              <TouchableOpacity
                                key={region}
                                style={[
                                  styles.regionChip,
                                  { 
                                    backgroundColor: isSelected 
                                      ? theme.colors.primary[500]
                                      : theme.colors.background.secondary,
                                    borderColor: isSelected
                                      ? theme.colors.primary[500]
                                      : theme.colors.border.light,
                                  }
                                ]}
                                onPress={() => handleRegionToggle(region)}
                              >
                                <Text 
                                  variant="caption" 
                                  color={isSelected ? 'inverse' : 'secondary'}
                                  style={{ fontWeight: isSelected ? '600' : '400' }}
                                >
                                  {region}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
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
  citySection: {
    marginBottom: 16,
  },
  cityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  regionSection: {
    marginTop: 8,
    marginLeft: 16,
  },
  regionHeader: {
    marginBottom: 8,
    marginLeft: 4,
  },
  regionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
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
