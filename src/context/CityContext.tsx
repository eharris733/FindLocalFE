import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { CITIES, sortCitiesByDistance, getCityInfo } from '../constants/cities';
import { logger } from '../utils/logger';

interface CityData {
  name: string;
}

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';
export type FeedSort = 'soonest' | 'nearest';

interface CityContextType {
  selectedCity: string;
  allCityData: CityData[];
  onCityChange: (city: string) => Promise<void>;
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

// The picker lists the canonical launch cities from constants/cities.ts.
// Previously this was derived by paging every active venue row (2,500+ rows,
// 3-4 serial requests) before the feed could even start loading; the feed's
// region chips come from the events themselves, so nothing needed that scan.
const ALL_CITY_DATA: CityData[] = CITIES.map((c) => ({ name: c.name }));

// On web, AsyncStorage is a thin wrapper over window.localStorage using the raw
// key, so the saved city can be read synchronously during the first render.
// That lets the events/venues queries start immediately instead of after an
// async storage round-trip. Native keeps the async path below.
const readSavedCitySync = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.PREFERRED_CITY);
  } catch {
    return null;
  }
};

// Tells the homepage Pages Function (functions/index.ts) which city to
// pre-render for this browser. Not read by the app itself.
const writeCityCookie = (city: string) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    document.cookie = `fl_city=${encodeURIComponent(city)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Cookies disabled — the edge falls back to the default city.
  }
};

export const CityProvider: React.FC<CityProviderProps> = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState<string>(() =>
    Platform.OS === 'web' ? readSavedCitySync() || DEFAULT_CITY : ''
  );

  // Keep the edge's notion of the city in step with the saved preference.
  useEffect(() => {
    if (selectedCity) writeCityCookie(selectedCity);
  }, [selectedCity]);

  const onCityChange = useCallback(async (city: string) => {
    setSelectedCity(city);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, city);
    } catch (err) {
      logger.error('Error saving city preference:', err);
    }
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
    const names = ALL_CITY_DATA.map((c) => c.name);
    if (!userLocation) return names;
    return sortCitiesByDistance(names, userLocation.latitude, userLocation.longitude);
  }, [userLocation]);

  // "Near me" should land you in the nearest available city, not just reorder
  // the picker. Skip names without coordinate data — they sort last and would
  // otherwise be picked alphabetically when nothing matches cities.ts.
  useEffect(() => {
    if (!pendingNearestSelect.current || !userLocation) return;
    pendingNearestSelect.current = false;
    setFeedSort('nearest');
    const nearest = nearbyCities.find((name) => getCityInfo(name));
    if (nearest && nearest !== selectedCity) {
      onCityChange(nearest);
    }
  }, [userLocation, nearbyCities, selectedCity, onCityChange]);

  // Native: restore the saved city asynchronously (web did it synchronously above).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_CITY)
      .then((savedCity) => setSelectedCity(savedCity || DEFAULT_CITY))
      .catch((err) => {
        logger.error('Error reading city preference:', err);
        setSelectedCity(DEFAULT_CITY);
      });
  }, []);

  const value = useMemo<CityContextType>(
    () => ({
      selectedCity,
      allCityData: ALL_CITY_DATA,
      onCityChange,
      nearbyCities,
      locationStatus,
      requestLocation,
      userLocation,
      feedSort,
      setFeedSort,
    }),
    [selectedCity, onCityChange, nearbyCities, locationStatus, requestLocation, userLocation, feedSort]
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
