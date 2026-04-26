import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { logger } from '../utils/logger';

interface FavoritesContextType {
  favoriteEventIds: string[];
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

const loadFromStorage = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_EVENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    logger.error('Error loading favorites:', error);
    return [];
  }
};

const saveToStorage = async (ids: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_EVENTS, JSON.stringify(ids));
  } catch (error) {
    logger.error('Error saving favorites:', error);
  }
};

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage().then((ids) => {
      setFavoriteEventIds(ids);
      setLoading(false);
    });
  }, []);

  const isFavorite = useCallback(
    (eventId: string): boolean => favoriteEventIds.includes(eventId),
    [favoriteEventIds]
  );

  const toggleFavorite = useCallback(
    async (eventId: string): Promise<void> => {
      const next = favoriteEventIds.includes(eventId)
        ? favoriteEventIds.filter((id) => id !== eventId)
        : [...favoriteEventIds, eventId];
      setFavoriteEventIds(next);
      await saveToStorage(next);
    },
    [favoriteEventIds]
  );

  return (
    <FavoritesContext.Provider value={{ favoriteEventIds, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
