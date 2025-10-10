import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAvailableCities } from '../api/events';
import { getDisplayCityName } from '../utils/cityUtils';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { updatePreferredCity } from '../api/profiles';
import { AuthContext } from '../providers/auth-provider';

interface CityData {
    name: string;
    neighborhoods?: string[];
    hasVenues?: boolean;
}

interface CityContextType {
    selectedCity: string; // Database city name
    displayCity: string;  // Display city name
    onCityChange: (city: string) => void;
    allCityData: CityData[];
    loading: boolean;
    error: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

interface CityProviderProps {
    children: ReactNode;
}

export const CityProvider: React.FC<CityProviderProps> = ({ children }) => {
    const [availableCitiesFromDB, setAvailableCitiesFromDB] = useState<string[]>([]);
    const [allCityData, setAllCityData] = useState<CityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(true);
    const [selectedCity, setSelectedCity] = useState('boston'); // Database city name
    const [displayCity, setDisplayCity] = useState('Boston'); // Display city name
    const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
    const authContext = useContext(AuthContext);
    const { profile, session } = authContext || { profile: null, session: null };

    const onCityChange = async (city: string) => {
        //console.log('🏙️ CityContext onCityChange called with:', city);
        
        // Map display names to database city names
        let dbCityName = city.toLowerCase();
        
        // Handle special cases where display name differs from database name
        if (city === 'New York' || city === 'Brooklyn' || city === 'Manhattan' || city === 'Queens' || city === 'Bronx' || city === 'Staten Island') {
            dbCityName = 'brooklyn'; // NYC venues are stored under 'brooklyn' in the database
            setDisplayCity('New York'); // Show "New York" in UI
        } else if (city === 'Boston' || city === 'Back Bay' || city === 'Cambridge' || city === 'Allston' || city === 'South End' || city === 'North End' || city === 'Fenway') {
            dbCityName = 'boston'; // Boston venues are stored under 'boston' in the database
            setDisplayCity('Boston'); // Show "Boston" in UI
        } else {
            // For neighborhoods, show the neighborhood name but use the parent city's database name
            if (['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island'].includes(city)) {
                dbCityName = 'brooklyn';
                setDisplayCity(getDisplayCityName(city)); // Show the neighborhood name
            } else if (['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'].includes(city)) {
                dbCityName = 'boston';
                setDisplayCity(getDisplayCityName(city)); // Show the neighborhood name
            } else {
                setDisplayCity(getDisplayCityName(city));
            }
        }

        //console.log('🏙️ CityContext Setting selectedCity from:', selectedCity, 'to:', dbCityName);
        //console.log('🏙️ CityContext Setting displayCity to:', city);
        setSelectedCity(dbCityName);
        //console.log('🏙️ CityContext City changed from display name:', city, 'to database name:', dbCityName);
        
        // Save to AsyncStorage
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, dbCityName);
        } catch (error) {
            console.error('Error saving city preference to storage:', error);
        }
        
        // If user is authenticated, sync to Supabase
        if (session?.user?.id) {
            try {
                await updatePreferredCity(session.user.id, dbCityName);
            } catch (error) {
                console.error('Error syncing city preference to Supabase:', error);
            }
        }
    };

    // Load saved city preference on mount
    useEffect(() => {
        const loadPreferredCity = async () => {
            try {
                const savedCity = await AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_CITY);
                if (savedCity) {
                    setSelectedCity(savedCity);
                    setDisplayCity(getDisplayCityName(savedCity));
                    console.log('✅ Loaded saved city preference:', savedCity);
                }
            } catch (error) {
                console.error('Error loading city preference:', error);
            } finally {
                setHasLoadedPreference(true);
            }
        };

        loadPreferredCity();
    }, []);

    // Sync with user's profile preference (cloud wins if different)
    useEffect(() => {
        const syncCityWithProfile = async () => {
            if (!profile || !hasLoadedPreference) {
                return;
            }

            const profileCity = profile.preferred_city;
            if (profileCity && profileCity !== selectedCity) {
                // Cloud preference exists and differs from local - cloud wins
                setSelectedCity(profileCity);
                setDisplayCity(getDisplayCityName(profileCity));
                
                // Update local storage to match cloud
                try {
                    await AsyncStorage.setItem(STORAGE_KEYS.PREFERRED_CITY, profileCity);
                    console.log('✅ Synced city preference from profile:', profileCity);
                } catch (error) {
                    console.error('Error syncing city from profile:', error);
                }
            } else if (!profileCity && session?.user?.id) {
                // No cloud preference exists - save current selection to cloud
                try {
                    await updatePreferredCity(session.user.id, selectedCity);
                    console.log('✅ Saved current city to profile:', selectedCity);
                } catch (error) {
                    console.error('Error saving city to profile:', error);
                }
            }
        };

        syncCityWithProfile();
    }, [profile, hasLoadedPreference, session]);

    // Load cities from database on component mount
    useEffect(() => {
        const loadCities = async () => {
            try {
                setLoading(true);
                const availableCities = await getAvailableCities();
                //console.log('Available cities with events:', availableCities);
                //console.log('Individual cities:', availableCities.map((city, index) => `${index}: "${city}"`));

                // Store available cities for neighborhood checking
                setAvailableCitiesFromDB(availableCities);

                // Helper function to check if a city has venues (case-insensitive and neighborhood mapping)
                const cityHasVenues = (cityName: string, neighborhoods?: string[]) => {
                    // Check exact match (case-insensitive)
                    const exactMatch = availableCities.some(city => city.toLowerCase() === cityName.toLowerCase());
                    //console.log(`Checking ${cityName}: exact match = ${exactMatch}`);

                    if (exactMatch) {
                        return true;
                    }

                    // Check if any neighborhoods have venues
                    if (neighborhoods) {
                        const neighborhoodMatch = neighborhoods.some(neighborhood => {
                            const match = availableCities.some(city => city.toLowerCase() === neighborhood.toLowerCase());
                                    // if (match) {
                                    //     console.log(`${cityName}: found match for neighborhood ${neighborhood}`);
                                    // }
                            return match;
                        });
                        // console.log(`${cityName}: neighborhood match = ${neighborhoodMatch}`);
                        return neighborhoodMatch;
                    }

                    return false;
                };

                // Hardcoded city data with neighborhoods - merge with database data
                const cityData: CityData[] = [
                    {
                        name: 'New York',
                        neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
                        hasVenues: cityHasVenues('New York', ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'])
                    },
                    {
                        name: 'Boston',
                        neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'],
                        hasVenues: cityHasVenues('Boston', ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'])
                    },
                    {
                        name: 'Los Angeles',
                        neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'],
                        hasVenues: cityHasVenues('Los Angeles', ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'])
                    },
                    {
                        name: 'Chicago',
                        neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'],
                        hasVenues: cityHasVenues('Chicago', ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'])
                    },
                    {
                        name: 'San Francisco',
                        neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'],
                        hasVenues: cityHasVenues('San Francisco', ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'])
                    },
                    {
                        name: 'Seattle',
                        neighborhoods: ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'],
                        hasVenues: cityHasVenues('Seattle', ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'])
                    },
                    {
                        name: 'Washington, DC',
                        neighborhoods: ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'],
                        hasVenues: cityHasVenues('Washington, DC', ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'])
                    },
                    {
                        name: 'Miami',
                        neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'],
                        hasVenues: cityHasVenues('Miami', ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'])
                    },
                    {
                        name: 'Austin',
                        neighborhoods: ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'],
                        hasVenues: cityHasVenues('Austin', ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'])
                    },
                    {
                        name: 'Portland',
                        neighborhoods: ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'],
                        hasVenues: cityHasVenues('Portland', ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'])
                    }
                ];

                setAllCityData(cityData);
            } catch (error) {
                console.error('Error loading cities:', error);
                // Fallback to cities without hasVenues data
                setAllCityData([
                    { name: 'New York', neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'], hasVenues: false },
                    { name: 'Boston', neighborhoods: ['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'], hasVenues: false },
                    { name: 'Los Angeles', neighborhoods: ['Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood'], hasVenues: false },
                    { name: 'Chicago', neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Gold Coast'], hasVenues: false },
                    { name: 'San Francisco', neighborhoods: ['SOMA', 'Mission', 'Castro', 'Haight', 'Pacific Heights'], hasVenues: false },
                    { name: 'Seattle', neighborhoods: ['Capitol Hill', 'Fremont', 'Ballard', 'Queen Anne', 'Belltown'], hasVenues: false },
                    { name: 'Washington, DC', neighborhoods: ['Dupont Circle', 'Georgetown', 'Adams Morgan', 'U Street', 'Capitol Hill'], hasVenues: false },
                    { name: 'Miami', neighborhoods: ['South Beach', 'Wynwood', 'Brickell', 'Little Havana', 'Coconut Grove'], hasVenues: false },
                    { name: 'Austin', neighborhoods: ['Downtown', 'South by Southwest', 'East Austin', 'Zilker', 'The Domain'], hasVenues: false },
                    { name: 'Portland', neighborhoods: ['Pearl District', 'Hawthorne', 'Alberta', 'Nob Hill', 'Sellwood'], hasVenues: false }
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadCities();
    }, []);

    const value: CityContextType = {
        selectedCity,
        displayCity,
        onCityChange,
        allCityData,
        loading,
        error
    };

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
