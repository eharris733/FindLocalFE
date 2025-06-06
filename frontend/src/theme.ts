// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    // Primary color: A slightly muted, deep teal/blue
    primary: {
      main: '#2A5D57', // Dark Teal
      light: '#5E8B83',
      dark: '#00332E',
      contrastText: '#FFFFFF',
    },
    // Secondary color: A warm, inviting orange/peach
    secondary: {
      main: '#E57373', // Muted Coral/Salmon
      light: '#FFAB91',
      dark: '#B04B4B',
      contrastText: '#FFFFFF',
    },
    // Error color (for alerts, etc.) - a slightly softer red
    error: {
      main: '#D32F2F', // Standard Material-UI error red, good for alerts
    },
    // Background colors
    background: {
      default: '#F5F5F5', // Light grey background
      paper: '#FFFFFF',  // White for cards, dialogs etc.
    },
    // Text colors
    text: {
      primary: '#333333', // Dark charcoal for main text
      secondary: '#555555', // Slightly lighter for secondary text
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
        color: '#666666', // Specific grey for dates
    }
  },
  spacing: 8, // Default spacing unit (e.g., 1*8px, 2*8px). Standard MUI is 8px.

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Prevent uppercase by default
          borderRadius: 8, // Slightly more rounded buttons
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // More rounded cards
          padding: 8, // <--- Add slight internal padding to cards
          transition: 'transform 0.2s ease-in-out', // Subtle hover transform
          '&:hover': {
            transform: 'translateY(-3px)', // Lift card slightly on hover
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6, // Slightly rounded chips
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          backgroundColor: '#5E8B83', // Use a lighter primary shade for chips
          color: '#FFFFFF',
        },
        colorSecondary: {
          backgroundColor: '#FFAB91', // Use a lighter secondary shade for chips
          color: '#333333', // Better contrast text for secondary chip
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8, // More rounded text fields
          },
        },
      },
    },
  },
});

export default theme;