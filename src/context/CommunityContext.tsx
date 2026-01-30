import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';

interface CommunityContextType {
  selectedCommunities: string[]; // Array of community names (e.g., ["Music", "Dance"])
  onCommunitiesChange: (communities: string[]) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

interface CommunityProviderProps {
  children: ReactNode;
}

export const CommunityProvider: React.FC<CommunityProviderProps> = ({ children }) => {
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedCommunities = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_INTERESTS);
        if (savedCommunities) {
          setSelectedCommunities(JSON.parse(savedCommunities));
        }
      } catch (error) {
        logger.error('Error loading community preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const onCommunitiesChange = useCallback(async (communities: string[]) => {
    logger.info('🎭 Communities changed:', communities);
    setSelectedCommunities(communities);

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_INTERESTS,
        JSON.stringify(communities)
      );
    } catch (error) {
      logger.error('Error saving community preferences:', error);
    }
  }, []);

  const value: CommunityContextType = useMemo(() => ({
    selectedCommunities,
    onCommunitiesChange,
  }), [selectedCommunities, onCommunitiesChange]);

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
