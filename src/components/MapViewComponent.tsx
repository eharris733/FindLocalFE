import React, { useState, useEffect } from 'react';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { getAllVenues, getVenuesByCity } from '../api/venues';
import { useCityLocation } from '../context/CityContext';
import { logger } from '../utils/logger';

interface MapViewComponentProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onVenuePress?: (venue: Venue) => void;
  highlightedEventId?: string;
}

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  events,
  onEventPress,
  onVenuePress,
  highlightedEventId,
}) => {
  const { selectedCity } = useCityLocation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  // Fetch venues with coordinates based on selected city
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        //console.log('🗺️ MapViewComponent: Fetching venues for city:', selectedCity);
        setVenuesLoading(true);
        
        // Use selectedCity to fetch city-specific venues
        const venueData = selectedCity 
          ? await getVenuesByCity(selectedCity)
          : await getAllVenues();
          
        // Filter venues that have coordinates
        const venuesWithCoords = venueData.filter(venue => 
          venue.latitude && venue.longitude && venue.is_active
        );

        //console.log(`🗺️ MapViewComponent: Found ${venuesWithCoords.length} venues with coordinates for ${selectedCity}`);
        setVenues(venuesWithCoords);
      } catch (error) {
        logger.error('Failed to fetch venues for map:', error);
      } finally {
        setVenuesLoading(false);
      }
    };

    fetchVenues();
  }, [selectedCity]); // Re-fetch when selectedCity changes

  const EventMap = require('./EventMap').default;
  return (
    <EventMap 
      key={`map-${selectedCity}`} // Force complete re-render when city changes
      events={events} 
      venues={venues}
      venuesLoading={venuesLoading}
      onEventPress={onEventPress}
      onVenuePress={onVenuePress}
      highlightedEventId={highlightedEventId}
      selectedCity={selectedCity}
    />
  );
};

export default MapViewComponent;
