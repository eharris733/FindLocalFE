import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  message: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  ctaLabel,
  onCtaPress,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text
        variant="body2"
        color="secondary"
        style={[styles.message, { color: theme.colors.text.secondary }]}
      >
        {message}
      </Text>
      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: theme.colors.primary[600] }]}
          onPress={onCtaPress}
        >
          <Text variant="label" style={{ color: theme.colors.text.inverse }}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
