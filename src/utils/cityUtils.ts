/**
 * Capitalizes city names properly for display
 * Handles cases like:
 * - "boston" -> "Boston"
 * - "new york" -> "New York"
 * - "san francisco" -> "San Francisco"
 * - "los angeles" -> "Los Angeles"
 */
export function capitalizeCityName(cityName: string | null | undefined): string {
  if (!cityName) return '';
  
  return cityName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gets a properly capitalized display name for a city
 * This is the main function to use throughout the app
 */
export function getDisplayCityName(cityName: string | null | undefined): string {
  return capitalizeCityName(cityName);
}
