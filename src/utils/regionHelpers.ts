/**
 * Helper function to extract unique regions from events
 * Use this to populate the availableRegions prop for FilterBarNew
 */

import type { Event } from '../types/events';

export const getAvailableRegions = (events: Event[]): string[] => {
  const regions = new Set<string>();
  
  for (const event of events) {
    if (event.region && event.region.trim() !== '') {
      regions.add(event.region);
    }
  }
  
  // Sort alphabetically
  return Array.from(regions).sort((a, b) => a.localeCompare(b));
};

/**
 * Helper to get region counts for analytics
 */
export const getRegionCounts = (events: Event[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  
  for (const event of events) {
    if (event.region) {
      counts[event.region] = (counts[event.region] || 0) + 1;
    }
  }
  
  return counts;
};

/**
 * Example usage in your component:
 * 
 * const { filteredEvents, events } = useEvents({ selectedCity });
 * const availableRegions = getAvailableRegions(events);
 * 
 * <FilterBarNew
 *   filters={filters}
 *   dispatchFilters={dispatchFilters}
 *   availableRegions={availableRegions}
 *   {...otherProps}
 * />
 */
