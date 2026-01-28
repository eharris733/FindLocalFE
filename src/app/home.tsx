import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function HomeRoute() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <View style={styles.content}>
        <Text variant="h1" style={{ textAlign: 'center', marginBottom: 16 }}>
          Coming Soon
        </Text>
        <Text variant="body1" color="secondary" style={{ textAlign: 'center' }}>
          We're working on something exciting for the home page.
        </Text>
      </View>
      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
