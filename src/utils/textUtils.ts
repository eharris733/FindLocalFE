/**
 * Capitalizes city names for display
 * Converts "boston" -> "Boston", "new york" -> "New York", etc.
 */
export function capitalizeCity(city: string): string {
  if (!city) return city;
  
  return city
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
