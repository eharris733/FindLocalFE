import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';

interface RegionPillsProps {
  availableRegions: string[];
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
}

const RegionPillsComponent: React.FC<RegionPillsProps> = ({
  availableRegions,
  selectedRegions,
  onRegionsChange,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();

  // If no regions available, don't render anything
  if (!availableRegions || availableRegions.length === 0) {
    return null;
  }

  const handleRegionPress = (region: string) => {
    if (selectedRegions.includes(region)) {
      // Toggle off - remove this region
      const newSelection = selectedRegions.filter(r => r !== region);
      onRegionsChange(newSelection);
    } else {
      // Toggle on - add this region
      onRegionsChange([...selectedRegions, region]);
    }
  };

  const handleAllPress = () => {
    // Clear all selections (all regions)
    onRegionsChange([]);
  };

  const allSelected = selectedRegions.length === 0;

  return (
    <View style={[styles.container, { paddingHorizontal: isMobile ? 12 : 16 }]}>
      <Text variant="caption" color="tertiary" style={styles.label}>
        FILTER BY REGION:
      </Text>
      <ScrollView
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: isMobile ? 12 : 16 }]}
        style={{ flexGrow: 0 }}
      >
        {/* "All" pill */}
        <TouchableOpacity
          style={[
            styles.pill,
            {
              backgroundColor: allSelected 
                ? theme.colors.primary[500] 
                : theme.colors.background.secondary,
              borderColor: allSelected
                ? theme.colors.primary[500]
                : theme.colors.border.light,
            }
          ]}
          onPress={handleAllPress}
        >
          <Text 
            variant="body2" 
            color={allSelected ? 'inverse' : 'secondary'}
            style={styles.pillLabel}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Region Pills */}
        {availableRegions.map((region) => {
          const isSelected = selectedRegions.includes(region);
          return (
            <TouchableOpacity
              key={region}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected 
                    ? theme.colors.primary[500] 
                    : theme.colors.background.secondary,
                  borderColor: isSelected
                    ? theme.colors.primary[500]
                    : theme.colors.border.light,
                }
              ]}
              onPress={() => handleRegionPress(region)}
            >
              <Text 
                variant="body2" 
                color={isSelected ? 'inverse' : 'secondary'}
                style={styles.pillLabel}
              >
                {region}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    width: '100%',
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  scrollContent: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillLabel: {
    fontWeight: '500',
    fontSize: 13,
  },
});

export const RegionPills = React.memo(RegionPillsComponent);
