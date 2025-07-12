// src/components/ListView.tsx


import { Typography, Grid } from '@mui/material';
import React from 'react';
import type { Event } from '../types/events';
import EventCard from './EventCard';


interface ListViewProps {
  events: Event[];
}

const ListView: React.FC<ListViewProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
        No events found for the current filters.
      </Typography>
    );
  }
  // 1. Sort the events array *before* mapping
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  });

  return (
    <Grid container spacing={{ xs: 3, md: 4 }}>
      {sortedEvents.map((event) => (
        <Grid size={{ xs: 6, sm: 6, md: 6 }} key={event.id}>
          <EventCard event={event} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ListView;