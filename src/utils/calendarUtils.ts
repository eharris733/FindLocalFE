import { Event } from '../types/events';
import { Venue } from '../types/venues';
import { Platform, Linking } from 'react-native';

/**
 * Formats a date to iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes special characters for iCalendar format
 */
function escapeICalString(str: string): string {
  return str
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');
}

/**
 * Parses time string (HH:MM) and combines with event date
 */
function parseEventDateTime(eventDate: string, startTime: string | null): Date {
  const date = new Date(eventDate);
  
  if (startTime?.includes(':')) {
    const [hours, minutes] = startTime.split(':').map(num => Number.parseInt(num, 10));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      date.setHours(hours, minutes, 0, 0);
    }
  } else {
    // Default to 7:00 PM if no time specified
    date.setHours(19, 0, 0, 0);
  }
  
  return date;
}

/**
 * Generates the event start and end times (2 hour duration)
 */
function getEventTimes(event: Event): { start: Date; end: Date } {
  if (!event.event_date) {
    throw new Error('Event date is required');
  }
  
  const startDate = parseEventDateTime(event.event_date, event.start_time);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 2); // 2 hour duration
  
  return { start: startDate, end: endDate };
}

/**
 * Generates event description with ticket link
 */
function generateDescription(event: Event): string {
  let description = event.description || 'Event details to be announced.';
  
  // Add ticket link if available
  if (event.ticket_page_url) {
    description += `\n\nTickets: ${event.ticket_page_url}`;
  } else if (event.detail_page_url) {
    description += `\n\nMore info: ${event.detail_page_url}`;
  } else if (event.root_url) {
    description += `\n\nMore info: ${event.root_url}`;
  }
  
  return description;
}

/**
 * Generates .ics file content for the event
 */
export function generateICalFile(event: Event, venue: Venue | null): string {
  const { start, end } = getEventTimes(event);
  const title = escapeICalString(event.title || 'Untitled Event');
  const description = escapeICalString(generateDescription(event));
  const location = venue?.address 
    ? escapeICalString(venue.address)
    : escapeICalString(event.city);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FindLocal//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICalDate(start)}`,
    `DTEND:${formatICalDate(end)}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `UID:${event.id}@findlocal.app`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Opens Google Calendar with event details
 */
export function addToGoogleCalendar(event: Event, venue: Venue | null): void {
  const { start, end } = getEventTimes(event);
  
  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const startStr = formatICalDate(start).replaceAll('-', '').replaceAll(':', '');
  const endStr = formatICalDate(end).replaceAll('-', '').replaceAll(':', '');
  
  const title = encodeURIComponent(event.title || 'Untitled Event');
  const description = encodeURIComponent(generateDescription(event));
  const location = venue?.address 
    ? encodeURIComponent(venue.address)
    : encodeURIComponent(event.city);
  
  // Google Calendar URL format
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${description}&location=${location}`;
  
  Linking.openURL(googleUrl);
}

/**
 * Downloads .ics file for Apple Calendar (and other calendar apps)
 */
export function addToAppleCalendar(event: Event, venue: Venue | null): void {
  const icsContent = generateICalFile(event, venue);
  
  if (Platform.OS === 'web') {
    // For web, create a download link
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title?.replaceAll(/[^a-z0-9]/gi, '_') || 'event'}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } else {
    // For mobile, use data URI
    const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    Linking.openURL(dataUri).catch(() => {
      // If data URI doesn't work, try sharing the ics content
      // This would require expo-sharing package which we can add if needed
      console.warn('Unable to open calendar file on this platform');
    });
  }
}

/**
 * Helper to determine which calendar method to use based on platform
 */
export function canAddToCalendar(): boolean {
  // Calendar functionality is available on all platforms
  return true;
}
