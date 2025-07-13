export const lightColors = {
  // Primary palette
  primary: {
    50: '#E6F7F5',
    100: '#B3E8E0',
    200: '#80D8CA',
    300: '#63BAAB',
    400: '#4DA399',
    500: '#006B5E',
    600: '#005A4F',
    700: '#004840',
    800: '#003631',
    900: '#002422',
  },
  
  // Secondary palette
  secondary: {
    50: '#FDF2E9',
    100: '#FADCC0',
    200: '#F7C596',
    300: '#F4AE6C',
    400: '#F19750',
    500: '#EC7C35',
    600: '#E0682A',
    700: '#D1521F',
    800: '#C23C14',
    900: '#B02009',
  },

  // Accent colors
  accent: {
    50: '#F5E6E0',
    100: '#E1B8A3',
    200: '#CC8A66',
    300: '#B75C29',
    400: '#A14610',
    500: '#842600',
    600: '#752200',
    700: '#661E00',
    800: '#571A00',
    900: '#481600',
  },

  // Neutral grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Semantic colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
};

export const darkColors = {
  // Primary palette (adjusted for dark mode)
  primary: {
    50: '#002422',
    100: '#003631',
    200: '#004840',
    300: '#005A4F',
    400: '#006B5E',
    500: '#63BAAB',
    600: '#80D8CA',
    700: '#B3E8E0',
    800: '#E6F7F5',
    900: '#F0FFFE',
  },
  
  // Secondary palette (adjusted for dark mode)
  secondary: {
    50: '#481600',
    100: '#571A00',
    200: '#661E00',
    300: '#752200',
    400: '#842600',
    500: '#EC7C35',
    600: '#F19750',
    700: '#F4AE6C',
    800: '#F7C596',
    900: '#FADCC0',
  },

  // Accent colors (adjusted for dark mode)
  accent: {
    50: '#481600',
    100: '#571A00',
    200: '#661E00',
    300: '#752200',
    400: '#842600',
    500: '#B75C29',
    600: '#CC8A66',
    700: '#E1B8A3',
    800: '#F5E6E0',
    900: '#FBF2ED',
  },

  // Neutral grays (inverted for dark mode)
  gray: {
    50: '#111827',
    100: '#1F2937',
    200: '#374151',
    300: '#4B5563',
    400: '#6B7280',
    500: '#9CA3AF',
    600: '#D1D5DB',
    700: '#E5E7EB',
    800: '#F3F4F6',
    900: '#F9FAFB',
  },

  // Status colors (darker variants)
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // Semantic colors for dark mode
  background: {
    primary: '#111827',
    secondary: '#1F2937',
    tertiary: '#374151',
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#E5E7EB',
    tertiary: '#9CA3AF',
    inverse: '#111827',
  },
  border: {
    light: '#374151',
    medium: '#4B5563',
    dark: '#6B7280',
  },
};

// Export both color themes
export const colors = lightColors; // Default to light colors for backwards compatibility
export type ColorTheme = typeof lightColors;
