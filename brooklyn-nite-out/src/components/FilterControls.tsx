// src/components/FilterControls.tsx

import React from 'react';
import type { EventFilters, FilterAction } from '../types/events.d';
import { Box, TextField, MenuItem, Button, Stack, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Import adapter
import SearchIcon from '@mui/icons-material/Search';
import ClearAllIcon from '@mui/icons-material/ClearAll';

interface FilterControlsProps {
  filters: EventFilters;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  dispatchFilters,
  availableCategories,
  availableLocations,
}) => {
  return (
    <Box
      sx={{
        p: 3,
        mb: 4,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      {/* <Typography variant="h6" component="h2" gutterBottom>
        Event Filters
      </Typography> */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        justifyContent="space-between"
      >
        {/* Search Text */}
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          placeholder="Title or description"
          value={filters.searchText}
          onChange={(e) =>
            dispatchFilters({ type: 'SET_SEARCH_TEXT', payload: e.target.value })
          }
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
        />

        {/* Category Filter */}
        <TextField
          select
          label="Category"
          variant="outlined"
          size="small"
          value={filters.category}
          onChange={(e) =>
            dispatchFilters({ type: 'SET_CATEGORY', payload: e.target.value })
          }
          sx={{ flexGrow: 1, minWidth: 150 }}
        >
          {availableCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>

        {/* Location Filter */}
        <TextField
          select
          label="Location"
          variant="outlined"
          size="small"
          value={filters.venue}
          onChange={(e) =>
            dispatchFilters({ type: 'SET_LOCATION', payload: e.target.value })
          }
          sx={{ flexGrow: 1, minWidth: 150 }}
        >
          {availableLocations.map((location) => (
            <MenuItem key={location} value={location}>
              {location}
            </MenuItem>
          ))}
        </TextField>

        {/* Start Date Filter */}
        <DatePicker
          label="Start Date"
          value={filters.startDate}
          onChange={(date: Date | null) =>
            dispatchFilters({ type: 'SET_START_DATE', payload: date })
          }
          // Using TextFieldProps for consistent styling with other MUI inputs
          slotProps={{ textField: { size: 'small', sx: { flexGrow: 1, minWidth: 150 } } }}
        />

        {/* Reset Filters Button */}
        <Button
          variant="contained"
          color="error"
          onClick={() => dispatchFilters({ type: 'RESET_FILTERS' })}
          startIcon={<ClearAllIcon />}
          sx={{ minWidth: 120 }}
        >
          Reset
        </Button>
      </Stack>
    </Box>
  );
};

export default FilterControls;