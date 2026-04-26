import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { logger } from '../utils/logger';

interface CityData {
  name: string;
  regions: string[];
}

interface CityContextType {
  selectedCity: string;
  availableRegions: string[];
  selectedRegions: string[];
  allCityData: CityData[];
  onCityChange: (city: string) => Promise<void>;
  onRegionsChange: (regions: string[]) => void;
  loading: boolean;
  error: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

interface CityProviderProps {
  children: ReactNode;
}

const DEFAULT_CITY = 'Boston';

const fetchRegionsForCity = async (city: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('region')
      .eq('city', city)
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching regions:', error);
      return [];
    }

    const regions = [...new Set(data.map((v) => v.region))].filter(Boolean) as string[];
    return regions.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    logger.error('Error fetching regions:', error);
    return [];
  }
};

const fetchAllCitiesAndRegions = async (): Promise<CityData[]> => {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('city, region')
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching cities:', error);
      return [];
    }

    const cityMap = new Map<string, Set<string>>();
    for (const venue of data) {
      if (venue.city && venue.region) {
        if (!cityMap.has(venue.city)) cityMap.set(venue.city, new Set());
        cityMap.get(venue.city)!.add(venue.region);
      }
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
    }),
    [selectedCity, availableRegions, selectedRegions, allCityData, onCityChange, onRegionsChange, loading, error]
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
