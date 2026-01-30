import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';

export function SetupScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      <Text variant="h3" color="primary" style={styles.title}>
        Setting up your FindLocal experience
      </Text>
      <Text variant="body1" color="secondary" style={styles.subtitle}>
        Loading events and venues for your city...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
  },
});
