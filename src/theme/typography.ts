import { TextStyle } from 'react-native';

export const typography = {
  // Font families with fallbacks
  fontFamily: {
    light: 'WorkSans_300Light, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
    regular: 'WorkSans_400Regular, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
    medium: 'WorkSans_500Medium, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
    semibold: 'WorkSans_600SemiBold, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
    bold: 'WorkSans_700Bold, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
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
    fontFamily: 'WorkSans_700Bold',
    lineHeight: 36,
  },
  
  heading2: {
    fontSize: 24,
    fontFamily: 'WorkSans_700Bold',
    lineHeight: 28,
  },
  
  heading3: {
    fontSize: 20,
    fontFamily: 'WorkSans_600SemiBold',
    lineHeight: 24,
  },
  
  heading4: {
    fontSize: 18,
    fontFamily: 'WorkSans_600SemiBold',
    lineHeight: 22,
  },
  
  body: {
    fontSize: 16,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 24,
  },
  
  bodySmall: {
    fontSize: 14,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 20,
  },
  
  caption: {
    fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 16,
  },
  
  button: {
    fontSize: 16,
    fontFamily: 'WorkSans_600SemiBold',
    lineHeight: 20,
  },
};
