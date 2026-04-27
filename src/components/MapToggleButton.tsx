import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Icon, Text } from './ui';
import { useTheme } from '../context/ThemeContext';

interface Props {
  current: 'list' | 'map';
  onToggle: () => void;
  compact?: boolean;
}

export const MapToggleButton: React.FC<Props> = ({ current, onToggle, compact = false }) => {
  const { theme } = useTheme();
  const showingMap = current === 'map';
  const label = showingMap ? 'List' : 'Map';
  const iconName = showingMap ? 'list' : 'map';

  return (
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${label.toLowerCase()} view`}
      style={[styles.button, { borderColor: theme.colors.border.light }]}
    >
      <View style={styles.row}>
        <Icon name={iconName} size={18} color={theme.colors.primary[500]} />
        {!compact && (
          <Text variant="label" color="primary" style={[styles.label, { color: theme.colors.primary[500] }]}>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default MapToggleButton;
