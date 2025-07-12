// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    // Primary color: Cool teal/green from your palette
    primary: {
      main: '#006B5E', // Your darkest teal - strong and professional
      light: '#63BAAB', // Your lighter mint green - softer accent
      dark: '#004A40', // Darker variation for hover states
      contrastText: '#FFFFFF',
    },
    // Secondary color: Warm orange/coral from your palette
    secondary: {
      main: '#EC7C35', // Your bright orange - energetic and inviting
      light: '#FF9A5A', // Lighter variation for subtle accents
      dark: '#842600', // Your darkest orange/brown for depth
      contrastText: '#FFFFFF',
    },
    // Error color - using your dark orange/brown as it's naturally warning-like
    error: {
      main: '#842600', // Your dark orange/brown - perfect for alerts
      light: '#B8440C',
      dark: '#5C1B00',
      contrastText: '#FFFFFF',
    },
    // Success color - using a variation of your teal
    success: {
      main: '#006B5E', // Your main teal for success states
      light: '#63BAAB', // Lighter mint for subtle success indicators
      dark: '#004A40',
      contrastText: '#FFFFFF',
    },
    // Background colors - keeping neutral for content readability
    background: {
      default: '#F8F9FA', // Very light grey background
      paper: '#FFFFFF',  // White for cards, dialogs etc.
    },
    // Text colors
    text: {
      primary: '#2C3E50', // Dark blue-grey for main text
      secondary: '#5A6C7D', // Medium grey for secondary text
    },
  },
  typography: {
    fontFamily: [
      'Inter', // Modern sans-serif, consider importing via Google Fonts
      'Arial',
      'sans-serif',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
    ].join(','),
    h3: { // For the main app title
      fontSize: '2.8rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#006B5E', // Using your primary teal for headings
    },
    h6: { // For event card titles
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    body2: { // For descriptions
      fontSize: '0.9rem',
      lineHeight: 1.5,
    },
    subtitle2: { // For date/time
        fontSize: '0.8rem',
        fontWeight: 400,
        color: '#5A6C7D', // Medium grey for dates
    }
  },
  spacing: 8, // Default spacing unit (e.g., 1*8px, 2*8px). Standard MUI is 8px.

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Prevent uppercase by default
          borderRadius: 8, // Slightly more rounded buttons
          fontWeight: 500,
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #006B5E 30%, #63BAAB 90%)', // Gradient using your teals
          '&:hover': {
            background: 'linear-gradient(45deg, #004A40 30%, #4A9B8E 90%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #842600 30%, #EC7C35 90%)', // Gradient using your oranges
          '&:hover': {
            background: 'linear-gradient(45deg, #5C1B00 30%, #D96A2E 90%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // More rounded cards
          padding: 8,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          border: '1px solid rgba(99, 186, 171, 0.1)', // Subtle border using your mint color
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 8px 25px rgba(0, 107, 94, 0.15)', // Shadow using your primary teal
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          backgroundColor: '#63BAAB', // Your lighter mint for primary chips
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#4A9B8E',
          },
        },
        colorSecondary: {
          backgroundColor: '#EC7C35', // Your bright orange for secondary chips
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#D96A2E',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#63BAAB', // Your mint color for hover
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#006B5E', // Your primary teal for focus
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#006B5E', // Your primary teal for focused labels
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#006B5E', // Your primary teal for selected state
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#004A40', // Darker teal for hover
            },
          },
        },
      },
    },
  },
});

export default theme;