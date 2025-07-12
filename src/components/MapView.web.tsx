import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface MapViewWebProps {
  events: any[];
  onMarkerPress: (event: any) => void;
}

const MapViewWeb: React.FC<MapViewWebProps> = ({ events, onMarkerPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>🗺️ Map View</Text>
        <Text style={styles.subtitle}>
          Map functionality is available on mobile devices
        </Text>
        <Text style={styles.info}>
          {events.length} events found
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.primary[600],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  info: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default MapViewWeb;