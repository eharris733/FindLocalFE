import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: TouchableOpacityProps['style'];
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getButtonStyles = () => {
    const baseStyles = {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      borderRadius: theme.borderRadius.md,
      borderWidth: variant === 'outline' ? 1 : 0,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
        borderColor: 'transparent',
      },
      secondary: {
        backgroundColor: disabled ? theme.colors.gray[200] : theme.colors.secondary[500],
        borderColor: 'transparent',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: disabled ? theme.colors.gray[300] : theme.colors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
    };

    return [
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      fullWidth && { width: '100%' as const },
      disabled && { opacity: 0.6 },
    ];
  };

  const getTextStyles = () => {
    const baseTextStyles = {
      fontFamily: theme.typography.fontFamily.semibold,
      textAlign: 'center' as const,
    };

    const sizeTextStyles = {
      small: {
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.sm,
      },
      medium: {
        fontSize: theme.typography.fontSize.base,
        lineHeight: theme.typography.lineHeight.base,
      },
      large: {
        fontSize: theme.typography.fontSize.lg,
        lineHeight: theme.typography.lineHeight.lg,
      },
    };

    const variantTextStyles = {
      primary: {
        color: theme.colors.text.inverse,
      },
      secondary: {
        color: theme.colors.text.inverse,
      },
      outline: {
        color: disabled ? theme.colors.gray[400] : theme.colors.primary[500],
      },
      ghost: {
        color: disabled ? theme.colors.gray[400] : theme.colors.text.primary,
      },
    };

    return [
      baseTextStyles,
      sizeTextStyles[size],
      variantTextStyles[variant],
    ];
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'secondary'
              ? theme.colors.text.inverse
              : theme.colors.primary[500]
          }
        />
      ) : (
        <Text style={getTextStyles()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
