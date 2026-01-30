import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { updatePreferredCity } from '../api/profiles';
import { AuthContext } from '../providers/auth-provider';
import { logger } from '../utils/logger';

interface RegionData {
    region: string; // Region name (e.g., "Brooklyn", "Cambridge")
    city: string;   // Parent city (e.g., "New York", "Boston")
}

interface CityData {
    name: string;     // City name (e.g., "Boston", "New York")
    regions: string[]; // Array of region names
}

interface CityContextType {
    selectedCity: string; // "Boston" or "New York"
    availableRegions: string[]; // All regions for the selected city
    selectedRegions: string[]; // Currently selected regions for filtering
    allCityData: CityData[]; // All cities with their regions
    onCityChange: (city: string) => Promise<void>;
    onRegionsChange: (regions: string[]) => void;
    loading: boolean;
    error: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

interface CityProviderProps {
    children: ReactNode;
}

export const CityProvider: React.FC<CityProviderProps> = ({ children }) => {
    const [selectedCity, setSelectedCity] = useState(''); // Start empty, load from storage
    const [availableRegions, setAvailableRegions] = useState<string[]>([]); // Regions for selected city
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]); // Selected regions for filtering
    const [allCityData, setAllCityData] = useState<CityData[]>([]); // All cities with their regions
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
    const authContext = useContext(AuthContext);
    const { profile, session } = authContext || { profile: null, session: null };

    // Fetch all regions from the database
    const fetchRegionsForCity = async (city: string): Promise<string[]> => {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('region')
                .eq('city', city)
                .eq('is_active', true);

            if (error) {
                logger.error('Error fetching regions from Supabase:', error);
                return [];
            }

            // Get unique regions
            const regions = [...new Set(data.map(venue => venue.region))].filter(Boolean) as string[];
            return regions.sort((a, b) => a.localeCompare(b));
        } catch (error) {
            logger.error('Error fetching regions:', error);
            return [];
        }
    };

    // Fetch all cities and their regions
    const fetchAllCitiesAndRegions = async (): Promise<CityData[]> => {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('city, region')
                .eq('is_active', true);

            if (error) {
                logger.error('Error fetching cities and regions from Supabase:', error);
                return [];
            }

            // Group regions by city
            const cityMap = new Map<string, Set<string>>();
            for (const venue of data) {
                if (venue.city && venue.region) {
                    if (!cityMap.has(venue.city)) {
                        cityMap.set(venue.city, new Set());
                    }
                    cityMap.get(venue.city)!.add(venue.region);
                }
            }

            // Convert to array format
            const cityData: CityData[] = Array.from(cityMap.entries()).map(([city, regions]) => ({
                name: city,
                regions: Array.from(regions).sort((a, b) => a.localeCompare(b))
            }));

            return cityData.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            logger.error('Error fetching cities and regions:', error);
            return [];
        }
    };

    const onCityChange = useCallback(async (city: string) => {
        logger.info('🏙️ CityContext onCityChange called with:', city);
        
        setSelectedCity(city);
        
        // Fetch regions for the new city
        const regions = await fetchRegionsForCity(city);
        setAvailableRegions(regions);
        
        // Clear selected regions when city changes
        setSelectedRegions([]);
        
        // Save to AsyncStorage
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, city);
        } catch (error) {
            logger.error('Error saving city preference to storage:', error);
        }
        
        // If user is authenticated, sync to Supabase
        if (session?.user?.id) {
            try {
                await updatePreferredCity(session.user.id, city);
            } catch (error) {
                logger.error('Error syncing city preference to Supabase:', error);
            }
        }
    }, [session]);

    const onRegionsChange = useCallback((regions: string[]) => {
        logger.info('📍 CityContext onRegionsChange called with:', regions);
        setSelectedRegions(regions);
    }, []);

    // Load saved city preference on mount
    useEffect(() => {
        const loadPreferredCity = async () => {
            try {
                // Check if onboarding is completed
                const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);

                // Only load/set city if onboarding is completed
                if (onboardingCompleted === 'true') {
                    const savedCity = await AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_CITY);
                    if (savedCity) {
                        setSelectedCity(savedCity);
                        const regions = await fetchRegionsForCity(savedCity);
                        setAvailableRegions(regions);
                        logger.info('✅ Loaded saved city preference:', savedCity);
                    } else {
                        // Default to Boston only if onboarding complete but no saved preference
                        setSelectedCity('Boston');
                        const regions = await fetchRegionsForCity('Boston');
                        setAvailableRegions(regions);
                        logger.info('✅ No saved preference, defaulting to Boston');
                    }
                } else {
                    // Onboarding not complete - leave city empty (no data fetching)
                    logger.info('⏸️ Onboarding not complete - city will be set after onboarding');
                }
            } catch (error) {
                logger.error('Error loading city preference:', error);
            } finally {
                setHasLoadedPreference(true);
            }
        };

        loadPreferredCity();
    }, []);

    // Sync with user's profile preference (cloud wins if different)
    useEffect(() => {
        const syncCityWithProfile = async () => {
            if (!profile || !hasLoadedPreference || !selectedCity) {
                return;
            }

            const profileCity = profile.preferred_city;

            // Check if this is a fresh onboarding completion (within last 10 seconds)
            const onboardingTimestamp = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
            const isFreshOnboarding = onboardingTimestamp === 'true' ||
                (onboardingTimestamp && Date.now() - parseInt(onboardingTimestamp) < 10000);

            if (profileCity && profileCity !== selectedCity && !isFreshOnboarding) {
                // Cloud preference exists and differs from local - cloud wins
                // BUT: Don't override if this is a fresh onboarding (local is the source of truth)
                setSelectedCity(profileCity);
                const regions = await fetchRegionsForCity(profileCity);
                setAvailableRegions(regions);

                // Update local storage to match cloud
                try {
                    await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, profileCity);
                    logger.info('✅ Synced city preference from profile:', profileCity);
                } catch (error) {
                    logger.error('Error syncing city from profile:', error);
                }
            } else if (selectedCity && session?.user?.id) {
                // Save current local selection to cloud (either no cloud pref, or fresh onboarding)
                try {
                    await updatePreferredCity(session.user.id, selectedCity);
                    logger.info('✅ Saved current city to profile:', selectedCity);
                } catch (error) {
                    logger.error('Error saving city to profile:', error);
                }
            }
        };

        syncCityWithProfile();
    }, [profile, hasLoadedPreference, session, selectedCity]);

    // Load cities and regions from database on component mount
    useEffect(() => {
        const loadCities = async () => {
            try {
                setLoading(true);
                const cityData = await fetchAllCitiesAndRegions();
                setAllCityData(cityData);
                setError(false);
            } catch (error) {
                logger.error('Error loading cities:', error);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadCities();
    }, []);

    const value: CityContextType = useMemo(() => ({
        selectedCity,
        availableRegions,
        selectedRegions,
        allCityData,
        onCityChange,
        onRegionsChange,
        loading,
        error
    }), [selectedCity, availableRegions, selectedRegions, allCityData, onCityChange, onRegionsChange, loading, error]);

    return (
        <CityContext.Provider value={value}>
            {children}
        </CityContext.Provider>
    );
};

export const useCityLocation = (): CityContextType => {
    const context = useContext(CityContext);
    if (context === undefined) {
        throw new Error('useCityLocation must be used within a CityProvider');
    }
    return context;
};
