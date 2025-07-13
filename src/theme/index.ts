import { lightColors, darkColors, colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const lightTheme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export const darkTheme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export const theme = lightTheme; // Default theme for backwards compatibility

export type Theme = typeof lightTheme;

// Export individual modules for convenience
export { colors, typography, spacing, borderRadius, shadows, lightColors, darkColors };
