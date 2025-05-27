// src/components/ToggleView.tsx

import React from 'react';
import { ToggleButtonGroup, ToggleButton, Typography, Box } from '@mui/material'; // Import Box and Typography
import ViewListIcon from '@mui/icons-material/ViewList'; // Icon for List view
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // Icon for Calendar view

interface ToggleViewProps {
  currentView: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

const ToggleView: React.FC<ToggleViewProps> = ({ currentView, onViewChange }) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'list' | 'calendar' | null, // newView can be null if nothing is selected
  ) => {
    if (newView !== null) { // Only update if a button is actually selected
      onViewChange(newView);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
        View:
      </Typography> */}
      <ToggleButtonGroup
        value={currentView}
        exclusive // Only one button can be selected at a time
        onChange={handleChange}
        aria-label="view selection"
        color="primary" // Uses your theme's primary color for the selected state
        sx={{
          borderRadius: 2, // Matches card/button rounding from theme
          '& .MuiToggleButton-root': {
            borderColor: 'divider', // Standard divider color for unselected borders
            textTransform: 'none', // Prevents uppercase
            fontWeight: 500,
            fontSize: '0.9rem',
            px: 2, // Horizontal padding
            py: 1, // Vertical padding
            display: 'flex',
            alignItems: 'center',
            gap: 0.5, // Space between icon and text
          },
          '& .Mui-selected': {
            backgroundColor: 'primary.main', // Background for selected
            color: 'primary.contrastText', // Text color for selected
            '&:hover': {
              backgroundColor: 'primary.dark', // Darken on hover for selected
            },
            borderColor: 'primary.main', // Border matches selected background
          },
          // Style for unselected buttons
          '& .MuiToggleButton-root:not(.Mui-selected)': {
            color: 'text.secondary', // Text color for unselected
            '&:hover': {
              backgroundColor: 'action.hover', // Light hover effect for unselected
            },
          },
        }}
      >
        <ToggleButton value="list" aria-label="list view">
          <ViewListIcon fontSize="small" />
          List
        </ToggleButton>
        <ToggleButton value="calendar" aria-label="calendar view">
          <CalendarTodayIcon fontSize="small" />
          Calendar
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default ToggleView;