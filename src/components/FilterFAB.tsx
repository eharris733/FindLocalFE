import React from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters } from '../hooks/useEvents';

export const FilterFAB: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { filters } = useFilters();
  const count = countActiveFilters(filters);

  return (
    <TouchableOpacity
      onPress={() => router.push('/filters')}
      accessibilityRole="button"
      accessibilityLabel="Open filters"
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.primary[500],
          shadowColor: '#000',
        },
      ]}
    >
      <Icon name="filter" size={24} color={theme.colors.text.inverse} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.secondary[500] }]}>
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 9999,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FilterFAB;
