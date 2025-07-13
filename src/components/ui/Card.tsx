import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: CardVariant;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  style?: ViewProps['style'];
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getCardStyles = () => {
    const baseStyles = {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[padding],
    };

    const variantStyles = {
      elevated: {
        backgroundColor: theme.colors.background.primary,
        ...theme.shadows.medium,
      },
      outlined: {
        backgroundColor: theme.colors.background.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
      },
      filled: {
        backgroundColor: theme.colors.background.secondary,
      },
    };

    return [baseStyles, variantStyles[variant]];
  };

  return (
    <View style={[getCardStyles(), style]} {...props}>
      {children}
    </View>
  );
};
