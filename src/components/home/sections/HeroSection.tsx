import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useCityLocation } from '../../../context/CityContext';
import { CityPicker } from '../../ui/CityPicker';

interface HeroSectionProps {
  simplified?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ simplified = false }) => {
  const { theme } = useTheme();
  const { selectedCity, selectedRegions, onCityChange, onRegionsChange } = useCityLocation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Text variant="h2" style={[styles.tagline, { color: theme.colors.text.primary }]}>
        Discover what's happening
      </Text>
      <Text variant="body1" color="secondary" style={styles.subtitle}>
        Find events, connect with venues, and make plans
      </Text>

      {!simplified && (
        <View style={styles.cityPickerContainer}>
          <CityPicker
            selectedCity={selectedCity}
            onCityChange={onCityChange}
            selectedRegions={selectedRegions}
            onRegionsChange={onRegionsChange}
            showTrigger={true}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tagline: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
  },
  cityPickerContainer: {
    marginTop: 8,
  },
});
