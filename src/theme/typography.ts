const fallback = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';

export const typography = {
  fontFamily: {
    light: `Manrope_400Regular, ${fallback}`,
    regular: `Manrope_400Regular, ${fallback}`,
    medium: `Manrope_500Medium, ${fallback}`,
    semibold: `Manrope_600SemiBold, ${fallback}`,
    bold: `Manrope_700Bold, ${fallback}`,
    headingSemibold: `Epilogue_600SemiBold, ${fallback}`,
    headingBold: `Epilogue_700Bold, ${fallback}`,
  },

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

  heading1: {
    fontSize: 30,
    fontFamily: 'Epilogue_700Bold',
    lineHeight: 36,
  },

  heading2: {
    fontSize: 24,
    fontFamily: 'Epilogue_700Bold',
    lineHeight: 32,
  },

  heading3: {
    fontSize: 20,
    fontFamily: 'Epilogue_600SemiBold',
    lineHeight: 28,
  },

  heading4: {
    fontSize: 18,
    fontFamily: 'Epilogue_600SemiBold',
    lineHeight: 24,
  },

  body: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 24,
  },

  bodySmall: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 20,
  },

  caption: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 16,
  },

  button: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 20,
  },
};
