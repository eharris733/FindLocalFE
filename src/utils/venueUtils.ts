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
      return 'Small Venue';
    case 'medium': 
      return 'Medium Venue';
    case 'large': 
      return 'Large Venue';
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
      return 'Small';
    case 'medium': 
      return 'Medium';
    case 'large': 
      return 'Large';
    default: 
      return size;
  }
}
