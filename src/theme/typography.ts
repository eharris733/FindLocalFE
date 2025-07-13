import { TextStyle } from 'react-native';

export const typography = {
  // Font families
  fontFamily: {
    regular: 'System', // Default system font
    medium: 'System', // You can add custom fonts later
    semibold: 'System',
    bold: 'System',
    light: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 40,
    '4xl': 44,
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Text styles
  heading1: {
    fontSize: 30,
    fontWeight: 'bold' as TextStyle['fontWeight'],
    lineHeight: 36,
  },
  
  heading2: {
    fontSize: 24,
    fontWeight: 'bold' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  
  heading3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  
  heading4: {
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  
  body: {
    fontSize: 16,
    fontWeight: 'normal' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  
  button: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
};
