// src/components/CalendarView.tsx

import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event as RBCEvent, View } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import type { Event } from '../types/events.d';
import { Box, Typography, Chip } from '@mui/material';

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  events: Event[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {
  // State for calendar navigation
  const [calendarView, setCalendarView] = useState<View>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const rbcEvents: RBCEvent[] = useMemo(() => {
    return events.map(event => {
      // Assuming event.date is a Date object or valid date string
      const eventDate = new Date(event.date);
      
      // Parse time - adjust this according to your actual time format
      let startTime: Date;
      try {
        // Try to parse time like "7:30pm" or similar
        const timeStr = event.time.replace(/\s/g, ''); // Remove spaces
        const isPM = /pm$/i.test(timeStr);
        let hours = parseInt(timeStr.replace(/[^0-9:]/g, '').split(':')[0]);
        const minutes = parseInt(timeStr.replace(/[^0-9:]/g, '').split(':')[1] || '0');
        
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        startTime = new Date(eventDate);
        startTime.setHours(hours, minutes, 0, 0);
      } catch (e) {
        // Fallback if parsing fails
        startTime = new Date(eventDate);
        startTime.setHours(19, 0, 0, 0); // Default to 7:00 PM
      }

      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assuming 1-hour events

      return {
        id: event.id || Math.random().toString(36).substring(2, 9), // Generate ID if none exists
        title: event.title,
        start: startTime,
        end: endTime,
        allDay: false,
        resource: event,
      };
    });
  }, [events]);

  const EventComponent = ({ event }: { event: RBCEvent }) => {
    const originalEvent = event.resource as Event;
    return (
      <Box sx={{ p: 0.5, fontSize: { xs: '0.7rem', sm: '0.8rem' }, lineHeight: 1.2, overflow: 'hidden' }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {originalEvent.title}
        </Typography>
        {originalEvent.category && (
          <Chip label={originalEvent.category} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: 700, width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, p: 3 }}>
      {events.length === 0 ? (
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
          No events to display on the calendar for these filters.
        </Typography>
      ) : (
        <Calendar
          localizer={localizer}
          events={rbcEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          components={{
            event: EventComponent,
          }}
          selectable
          onSelectEvent={(event) => alert(`Event: ${event.title}\nCategory: ${(event.resource as Event).category || 'None'}`)}
          onSelectSlot={(slotInfo) => alert(`Selected a slot from ${format(slotInfo.start, 'PP')} to ${format(slotInfo.end, 'PP')}`)}
          view={calendarView}
          onView={setCalendarView}
          date={calendarDate}
          onNavigate={setCalendarDate}
        />
      )}
    </Box>
  );
};

export default CalendarView;