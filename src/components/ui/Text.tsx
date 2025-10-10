import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline' | 'link';
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'success' | 'warning' | 'error' | 'info';

interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: RNTextProps['style'];
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body1',
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getTextStyles = () => {
    const variantStyles = {
      h1: {
        fontSize: theme.typography.fontSize['4xl'],
        lineHeight: theme.typography.lineHeight['4xl'],
        fontFamily: theme.typography.fontFamily.bold,
      },
      h2: {
        fontSize: theme.typography.fontSize['3xl'],
        lineHeight: theme.typography.lineHeight['3xl'],
        fontFamily: theme.typography.fontFamily.bold,
      },
      h3: {
        fontSize: theme.typography.fontSize['2xl'],
        lineHeight: theme.typography.lineHeight['2xl'],
        fontFamily: theme.typography.fontFamily.semibold,
      },
      h4: {
        fontSize: theme.typography.fontSize.xl,
        lineHeight: theme.typography.lineHeight.xl,
        fontFamily: theme.typography.fontFamily.semibold,
      },
      h5: {
        fontSize: theme.typography.fontSize.lg,
        lineHeight: theme.typography.lineHeight.lg,
        fontFamily: theme.typography.fontFamily.medium,
      },
      h6: {
        fontSize: theme.typography.fontSize.base,
        lineHeight: theme.typography.lineHeight.base,
        fontFamily: theme.typography.fontFamily.medium,
      },
      body1: {
        fontSize: theme.typography.fontSize.base,
        lineHeight: theme.typography.lineHeight.base,
        fontFamily: theme.typography.fontFamily.regular,
      },
      body2: {
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.sm,
        fontFamily: theme.typography.fontFamily.regular,
      },
      caption: {
        fontSize: theme.typography.fontSize.xs,
        lineHeight: theme.typography.lineHeight.xs,
        fontFamily: theme.typography.fontFamily.regular,
      },
      overline: {
        fontSize: theme.typography.fontSize.xs,
        lineHeight: theme.typography.lineHeight.xs,
        fontFamily: theme.typography.fontFamily.medium,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
      },
      link: {
        fontSize: theme.typography.fontSize.xs,
        lineHeight: theme.typography.lineHeight.xs,
        fontFamily: theme.typography.fontFamily.medium,
        textDecorationLine: 'underline',
      }
    };

    const colorStyles = {
      primary: { color: theme.colors.text.primary },
      secondary: { color: theme.colors.text.secondary },
      tertiary: { color: theme.colors.text.tertiary },
      inverse: { color: theme.colors.text.inverse },
      success: { color: theme.colors.success },
      warning: { color: theme.colors.warning },
      error: { color: theme.colors.error },
      info: { color: theme.colors.info },
    };

    return [
      variantStyles[variant],
      colorStyles[color],
      { textAlign: align },
    ];
  };

  return (
    <RNText style={[getTextStyles(), style]} {...props}>
      {children}
    </RNText>
  );
};
