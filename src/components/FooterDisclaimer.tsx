import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui';

export default function FooterDisclaimer() {
  return (
    <View style={styles.container}>
      <Text variant="caption" color="tertiary" align="center">
        {'\u00A9'} 2026 FindLocal. FindLocal is a registered trademark and operating name of EH Solutions LLC.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});
