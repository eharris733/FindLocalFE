import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { sortCitiesByDistance, getCityInfo } from '../constants/cities';
import { logger } from '../utils/logger';

interface CityData {
  name: string;
  regions: string[];
}

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';
export type FeedSort = 'soonest' | 'nearest';

interface CityContextType {
  selectedCity: string;
  availableRegions: string[];
  selectedRegions: string[];
  allCityData: CityData[];
  onCityChange: (city: string) => Promise<void>;
  onRegionsChange: (regions: string[]) => void;
  loading: boolean;
  error: boolean;
  /** City names ordered nearest-first once the user shares their location. */
  nearbyCities: string[];
  locationStatus: LocationStatus;
  requestLocation: () => void;
  /** Set once the user shares their location; drives distance sort + labels. */
  userLocation: { latitude: number; longitude: number } | null;
  /** Feed ordering. Session-only; a granted "Near me" flips it to 'nearest'. */
  feedSort: FeedSort;
  setFeedSort: (sort: FeedSort) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

interface CityProviderProps {
  children: ReactNode;
}

const DEFAULT_CITY = 'Boston';

interface VenueRow {
  city: string | null;
  region: string | null;
}

// Supabase caps each response at 1000 rows, so page through active venues —
// otherwise cities/regions silently vanish from the picker once the venue
// count passes the cap.
const VENUE_PAGE_SIZE = 1000;

const fetchActiveVenues = async (city?: string): Promise<VenueRow[]> => {
  const rows: VenueRow[] = [];
  for (let page = 0; ; page++) {
    let query = supabase
      .from('venues')
      .select('city, region')
      .eq('is_active', true)
      .order('id')
      .range(page * VENUE_PAGE_SIZE, (page + 1) * VENUE_PAGE_SIZE - 1);
    if (city) query = query.eq('city', city);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as VenueRow[]));
    if (!data || data.length < VENUE_PAGE_SIZE) break;
  }
  return rows;
};

const fetchRegionsForCity = async (city: string): Promise<string[]> => {
  try {
    const data = await fetchActiveVenues(city);
    const regions = [...new Set(data.map((v) => v.region))].filter(Boolean) as string[];
    return regions.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    logger.error('Error fetching regions:', error);
    return [];
  }
};

const fetchAllCitiesAndRegions = async (): Promise<CityData[]> => {
  try {
    const data = await fetchActiveVenues();

    // A city appears as soon as it has active venues. Region is optional — new
    // cities may not have region data yet, so we still list the city (with an
    // empty region set) rather than hiding it.
    const cityMap = new Map<string, Set<string>>();
    for (const venue of data) {
      if (!venue.city) continue;
      if (!cityMap.has(venue.city)) cityMap.set(venue.city, new Set());
      if (venue.region) cityMap.get(venue.city)!.add(venue.region);
    }

    return Array.from(cityMap.entries())
      .map(([name, regions]) => ({
        name,
        regions: Array.from(regions).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error('Error fetching cities:', error);
    return [];
  }
};

export const CityProvider: React.FC<CityProviderProps> = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [allCityData, setAllCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onCityChange = useCallback(async (city: string) => {
    setSelectedCity(city);
    setSelectedRegions([]);
    const regions = await fetchRegionsForCity(city);
    setAvailableRegions(regions);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, city);
    } catch (err) {
      logger.error('Error saving city preference:', err);
    }
  }, []);

  const onRegionsChange = useCallback((regions: string[]) => {
    setSelectedRegions(regions);
  }, []);

  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [feedSort, setFeedSort] = useState<FeedSort>('soonest');
  // Set per explicit "Near me" tap so a granted location switches the city
  // exactly once, without fighting later manual picks.
  const pendingNearestSelect = useRef(false);

  const requestLocation = useCallback(() => {
    // Web + modern RN both expose the W3C geolocation API when available.
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('locating');
    pendingNearestSelect.current = true;
    geo.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus('granted');
      },
      (err) => {
        pendingNearestSelect.current = false;
        logger.warn('Geolocation unavailable:', err?.message);
        setLocationStatus(err?.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  const nearbyCities = useMemo(() => {
    const names = allCityData.map((c) => c.name);
    if (!userLocation) return names;
    return sortCitiesByDistance(names, userLocation.latitude, userLocation.longitude);
  }, [allCityData, userLocation]);

  // "Near me" should land you in the nearest available city, not just reorder
  // the picker. Skip names without coordinate data — they sort last and would
  // otherwise be picked alphabetically when nothing matches cities.ts.
  useEffect(() => {
    if (!pendingNearestSelect.current || !userLocation || allCityData.length === 0) return;
    pendingNearestSelect.current = false;
    setFeedSort('nearest');
    const nearest = nearbyCities.find((name) => getCityInfo(name));
    if (nearest && nearest !== selectedCity) {
      onCityChange(nearest);
    }
  }, [userLocation, allCityData, nearbyCities, selectedCity, onCityChange]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [cities, savedCity] = await Promise.all([
          fetchAllCitiesAndRegions(),
          AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_CITY),
        ]);
        setAllCityData(cities);
        const initialCity = savedCity || DEFAULT_CITY;
        setSelectedCity(initialCity);
        const regions = await fetchRegionsForCity(initialCity);
        setAvailableRegions(regions);
        setError(false);
      } catch (err) {
        logger.error('Error initializing CityContext:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const value = useMemo<CityContextType>(
    () => ({
      selectedCity,
      availableRegions,
      selectedRegions,
      allCityData,
      onCityChange,
      onRegionsChange,
      loading,
      error,
      nearbyCities,
      locationStatus,
      requestLocation,
      userLocation,
      feedSort,
      setFeedSort,
    }),
    [selectedCity, availableRegions, selectedRegions, allCityData, onCityChange, onRegionsChange, loading, error, nearbyCities, locationStatus, requestLocation, userLocation, feedSort]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
};

export const useCityLocation = (): CityContextType => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCityLocation must be used within a CityProvider');
  }
  return context;
};
