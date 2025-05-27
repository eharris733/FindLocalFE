// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from '@mui/material/styles'; // Import ThemeProvider
import theme from './theme.ts'; // Import your custom theme
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // Import LocalizationProvider
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Import date-fns adapter
import CssBaseline from '@mui/material/CssBaseline'; // Optional: for consistent baseline styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline resets browser default styles for MUI */}
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);