import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Community, CommunityLabelsGrouped } from '../api/communities';
import { logger } from '../utils/logger';

const STORAGE_KEYS = {
  SELECTED_COMMUNITIES: '@findlocal_selected_communities',
  SELECTED_CITY: '@findlocal_selected_city',
};

interface CommunityContextType {
  selectedCommunities: string[]; // Array of community names (e.g., ["Music", "Dance"])
  selectedCity: string; // Current city (still needed for labels/venues)
  allCommunities: Community[]; // All available communities
  labelsForCity: CommunityLabelsGrouped; // Labels grouped by community for the selected city
  onCommunitiesChange: (communities: string[]) => Promise<void>;
  onCityChange: (city: string) => Promise<void>;
  loading: boolean;
  error: boolean;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

interface CommunityProviderProps {
  children: ReactNode;
}

export const CommunityProvider: React.FC<CommunityProviderProps> = ({ children }) => {
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('New York'); // Default city
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [labelsForCity, setLabelsForCity] = useState<CommunityLabelsGrouped>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedCommunities, savedCity] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COMMUNITIES),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CITY),
        ]);

        if (savedCommunities) {
          setSelectedCommunities(JSON.parse(savedCommunities));
        }
        if (savedCity) {
          setSelectedCity(savedCity);
        }

        setHasLoadedPreferences(true);
      } catch (error) {
        logger.error('Error loading community preferences:', error);
        setHasLoadedPreferences(true);
      }
    };

    loadPreferences();
  }, []);

  // Fetch communities and labels when city changes or on initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(false);

        // Fetch communities available in the current city
        const { getCommunitiesForCity, getAllLabelsForCity } = await import('../api/communities');
        
        const communities = await getCommunitiesForCity(selectedCity);
        
        logger.info('🎭 Loaded communities for', selectedCity, ':', communities.length);
        
        setAllCommunities(communities);
        
        // Get community IDs from selected community names
        const communityIds = selectedCommunities
          .map(name => communities.find(c => c.name === name)?.id)
          .filter(Boolean) as string[];
        
        // Fetch labels filtered by selected communities (or all if none selected)
        const labels = await getAllLabelsForCity(selectedCity, communityIds.length > 0 ? communityIds : undefined);
        
        logger.info('🏷️ Loaded labels for', selectedCity, ':', Object.keys(labels).length, 'communities', labels);
        
        setLabelsForCity(labels);
      } catch (err) {
        logger.error('Error loading community data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (hasLoadedPreferences) {
      loadData();
    }
  }, [selectedCity, hasLoadedPreferences, selectedCommunities]);

  const onCommunitiesChange = useCallback(async (communities: string[]) => {
    logger.info('🎭 Communities changed:', communities);
    setSelectedCommunities(communities);

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_COMMUNITIES,
        JSON.stringify(communities)
      );
      
      // Reload labels filtered by selected communities
      const { getAllLabelsForCity } = await import('../api/communities');
      const communityIds = communities
        .map(name => allCommunities.find(c => c.name === name)?.id)
        .filter(Boolean) as string[];
      
      const labels = await getAllLabelsForCity(selectedCity, communityIds);
      logger.info('🏷️ Reloaded labels for selected communities:', Object.keys(labels).length, 'communities');
      setLabelsForCity(labels);
    } catch (error) {
      logger.error('Error saving community preferences:', error);
    }
  }, [allCommunities, selectedCity]);

  const onCityChange = useCallback(async (city: string) => {
    logger.info('🏙️ City changed:', city);
    setSelectedCity(city);

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CITY, city);
      
      // Reload communities and labels for new city
      const { getCommunitiesForCity, getAllLabelsForCity } = await import('../api/communities');
      const [communities, labels] = await Promise.all([
        getCommunitiesForCity(city),
        getAllLabelsForCity(city)
      ]);
      
      logger.info('🎭 Reloaded communities for', city, ':', communities.length);
      logger.info('🏷️ Reloaded labels for', city, ':', Object.keys(labels).length, 'communities');
      
      setAllCommunities(communities);
      setLabelsForCity(labels);
      
      // Clear invalid community selections (communities not available in new city)
      const availableCommunityNames = communities.map(c => c.name);
      const validSelections = selectedCommunities.filter(name => 
        availableCommunityNames.includes(name)
      );
      
      if (validSelections.length !== selectedCommunities.length) {
        logger.info('🎭 Clearing invalid community selections. Was:', selectedCommunities, 'Now:', validSelections);
        setSelectedCommunities(validSelections);
        await AsyncStorage.setItem(
          STORAGE_KEYS.SELECTED_COMMUNITIES,
          JSON.stringify(validSelections)
        );
      }
    } catch (error) {
      logger.error('Error changing city:', error);
    }
  }, [selectedCommunities]);

  const value: CommunityContextType = useMemo(() => ({
    selectedCommunities,
    selectedCity,
    allCommunities,
    labelsForCity,
    onCommunitiesChange,
    onCityChange,
    loading,
    error,
  }), [selectedCommunities, selectedCity, allCommunities, labelsForCity, onCommunitiesChange, onCityChange, loading, error]);

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
