// Launch-city list for the Pages Functions. Functions bundle separately from
// the app, so this mirrors src/constants/cities.ts — keep the names in sync
// with the `city` values in the venues/events_gold tables.

export interface FunctionCity {
  name: string;
  state: string;
  slug: string;
}

/** URL slug for a city name: lowercase, spaces → dashes, dots dropped. */
export function citySlug(name: string): string {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-');
}

const NAMES: Array<[string, string]> = [
  ['Atlanta', 'GA'],
  ['Austin', 'TX'],
  ['Baltimore', 'MD'],
  ['Boston', 'MA'],
  ['Burlington', 'VT'],
  ['Charlotte', 'NC'],
  ['Chicago', 'IL'],
  ['Cincinnati', 'OH'],
  ['Dallas', 'TX'],
  ['Denver', 'CO'],
  ['Detroit', 'MI'],
  ['Houston', 'TX'],
  ['Kansas City', 'MO'],
  ['Las Vegas', 'NV'],
  ['Los Angeles', 'CA'],
  ['Miami', 'FL'],
  ['Minneapolis', 'MN'],
  ['New York', 'NY'],
  ['Orlando', 'FL'],
  ['Philadelphia', 'PA'],
  ['Phoenix', 'AZ'],
  ['Pittsburgh', 'PA'],
  ['Portland', 'OR'],
  ['Sacramento', 'CA'],
  ['San Antonio', 'TX'],
  ['San Diego', 'CA'],
  ['San Francisco', 'CA'],
  ['Seattle', 'WA'],
  ['St. Louis', 'MO'],
  ['Tampa', 'FL'],
  ['Washington', 'DC'],
];

export const FUNCTION_CITIES: FunctionCity[] = NAMES.map(([name, state]) => ({
  name,
  state,
  slug: citySlug(name),
}));

export function cityBySlug(slug: string): FunctionCity | undefined {
  return FUNCTION_CITIES.find((c) => c.slug === slug);
}
