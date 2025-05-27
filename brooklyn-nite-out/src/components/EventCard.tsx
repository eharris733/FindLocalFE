// src/components/EventCard.tsx

import React from 'react';
import type { Event } from '../types/events.d'; // Ensure this path is correct
import { format } from 'date-fns';
import { Card, CardContent, CardMedia, Typography, Box, Chip, CardActionArea } from '@mui/material';

interface EventCardProps {
  event: Event;
}
function formatMilitaryTime(time: string): string {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      return time; // return as-is if not valid
    }
  
    const [hoursStr, minutesStr] = time.split(':');
  
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
  
    if (isNaN(hours) || isNaN(minutes)) {
      return time; // return as-is if parsing fails
    }
  
    const isPM = hours >= 12;
    const formattedHours = isPM ? (hours === 12 ? 12 : hours - 12) : (hours === 0 ? 12 : hours);
    const formattedMinutes = minutes.toString().padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes} ${isPM ? 'PM' : 'AM'}`;
  }
  

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const handleCardClick = () => {
    if (event.url) {
      window.open(event.url, '_blank', 'noopener,noreferrer'); // Open in new tab
    }
  };

  return (
    <Card sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      boxShadow: 3,
      transition: '0.3s',
      '&:hover': { boxShadow: 6, cursor: event.url ? 'pointer' : 'default' },
      height: { xs: 'auto', sm: 220 }, // Consistent height for larger screens
      minHeight: { xs: 250, sm: 220 }, // Ensure a minimum height for smaller screens
    }}>
      <CardActionArea onClick={handleCardClick} disabled={!event.url} sx={{ display: 'flex', height: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, height: '100%', width: '100%' }}>

          {/* Image Container with Fixed Dimensions */}
          <Box sx={{
            width: { xs: '100%', sm: 180 }, // Fixed width for desktop
            height: { xs: 150, sm: '100%' }, // Fixed height for mobile, full height for desktop
            flexShrink: 0, // Prevent image from shrinking
            display: 'flex',
            alignItems: 'center', // Vertically center image if smaller than container
            justifyContent: 'center', // Horizontally center image if smaller than container
            bgcolor: 'grey.100', // Background color for aspect ratio padding
          }}>
            <CardMedia
              component="img"
              sx={{
                maxWidth: '100%', // Ensure image doesn't overflow container
                maxHeight: '100%', // Ensure image doesn't overflow container
                objectFit: 'contain', // <--- IMPORTANT: Prevents stretching, maintains aspect ratio
              }}
              image={event.preview_image}
              alt={event.title}
            />
          </Box>

          {/* Content Box */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            p: 2,
            overflow: 'hidden',
            // Pushes content up, ensuring chips are at the bottom within the flex column
            justifyContent: 'space-between',
          }}>
            <CardContent sx={{
              p: 0, // Remove default CardContent padding
              pb: 0, // Remove default CardContent padding-bottom
              flexGrow: 1, // Allows content to grow and push chips to bottom
            }}>
              <Typography
                component="h3"
                variant="h6"
                color="text.primary"
                sx={{
                  mb: 0.5,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
                title={event.title}
              >
                {event.title}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75 }}>
                {format(event.date, 'EEEE, MMMM do')} at {event.time? formatMilitaryTime(event.time): 'Time not specified'}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5, // Small margin top for visual separation
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: { xs: 2, sm: 3 }, // Adjusted line clamp for description
                  flexGrow: 1, // Ensures description uses available space
                }}
              >
                {event.description}
              </Typography>
            </CardContent>
            {/* Chips Box */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', mt: 1, pt: 0.5 }}> {/* Adjusted mt/pt for closer spacing */}
              {event.category && (
                <Chip label={event.category} color="primary" size="small" />
              )}
              {event.venue && (
                <Chip label={event.venue} color="secondary" size="small" />
              )}
            </Box>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};

export default EventCard;