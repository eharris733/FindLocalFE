/**
 * Utility functions for venue-related operations
 */

/**
 * Converts venue size to a human-readable label
 * @param size - The venue size string ('small', 'medium', 'large', etc.)
 * @returns A formatted label with capacity information
 */
export function getVenueSizeLabel(size: string): string {
  if (!size) return '';
  
  switch (size.toLowerCase()) {
    case 'small': 
      return 'Small Venue (< 50 people)';
    case 'medium': 
      return 'Medium Venue (50-200 people)';
    case 'large': 
      return 'Large Venue (200+ people)';
    default: 
      return `${size} Venue`;
  }
}

/**
 * Converts venue size to a compact label for limited space displays
 * @param size - The venue size string ('small', 'medium', 'large', etc.)
 * @returns A shortened label format
 */
export function getCompactVenueSizeLabel(size: string): string {
  if (!size) return '';
  
  switch (size.toLowerCase()) {
    case 'small': 
      return 'Small (< 50)';
    case 'medium': 
      return 'Medium (50-200)';
    case 'large': 
      return 'Large (200+)';
    default: 
      return size;
  }
}
