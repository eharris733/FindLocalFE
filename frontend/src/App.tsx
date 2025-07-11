// src/App.tsx

import { useEvents } from './hooks/useEvents';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import ToggleView from './components/ToggleView';
import FilterControls from './components/FilterControls';
import { Container, Box, Typography, CircularProgress, Alert, Stack } from '@mui/material'; 

function App() {
  const {
    loading,
    error,
    currentView,
    setCurrentView,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
  } = useEvents();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <img 
          src="/logo.png" 
          alt="FindLocal Logo" 
          style={{ 
            maxWidth: '300px', 
            height: 'auto', 
            marginBottom: '16px' 
          }} 
        />
        {/* <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Find Local
        </Typography> */}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary" sx={{ ml: 2, alignSelf: 'center' }}>
            Loading events...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 4 }}>
          <Typography variant="h6">Error loading events:</Typography>
          <Typography>{error}</Typography>
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mb: 3 }}
          >
            <ToggleView currentView={currentView} onViewChange={setCurrentView} />
            {/* FilterControls is now a separate component */}
          </Stack>

          <FilterControls
            filters={filters}
            dispatchFilters={dispatchFilters}
            availableCategories={availableCategories}
            availableLocations={availableLocations}
          />

          {currentView === 'list' ? (
            <ListView events={filteredEvents} />
          ) : (
            <CalendarView events={filteredEvents} />
          )}
        </>
      )}
    </Container>
  );
}

export default App;