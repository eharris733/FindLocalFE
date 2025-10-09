import {useEffect, useState} from "react";
import {getAvailableCities} from "../api/events";

interface CityData {
    name: string;
    neighborhoods?: string[];
    hasVenues?: boolean;
}

export const useCityLocation = () => {
    const [availableCitiesFromDB, setAvailableCitiesFromDB] = useState<string[]>([]);
    const [allCityData, setAllCityData] = useState<CityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(true);
    const [selectedCity, setSelectedCity] = useState('boston'); // Database city name
    const [displayCity, setDisplayCity] = useState('Boston'); // Display city name

    const onCityChange = (city: string) => {
        //console.log('🏙️ onCityChange called with:', city);
        
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
                setDisplayCity(city); // Show the neighborhood name
            } else if (['Back Bay', 'Cambridge', 'Allston', 'South End', 'North End', 'Fenway'].includes(city)) {
                dbCityName = 'boston';
                setDisplayCity(city); // Show the neighborhood name
            } else {
                setDisplayCity(city);
            }
        }

        //console.log('🏙️ Setting selectedCity from:', selectedCity, 'to:', dbCityName);
        //console.log('🏙️ Setting displayCity to:', city);
        setSelectedCity(dbCityName);
        //console.log('🏙️ City changed from display name:', city, 'to database name:', dbCityName, 'display will be:', city);
    };


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

    return {
        selectedCity, // Database city name (for API calls)
        displayCity,  // Display city name (for UI)
        onCityChange,
        allCityData,
        loading,
        error
    }
}