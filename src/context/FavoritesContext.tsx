import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  loadFavoritesFromStorage, 
  saveFavoritesToStorage, 
  syncFavoritesToSupabase,
  mergeFavorites 
} from '../api/favorites';

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

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const { profile, session } = useAuth();

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    const loadInitialFavorites = async () => {
      setLoading(true);
      try {
        const localFavorites = await loadFavoritesFromStorage();
        setFavoriteEventIds(localFavorites);
      } catch (error) {
        console.error('Error loading initial favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialFavorites();
  }, []);

  // Sync with Supabase when user logs in or profile changes
  useEffect(() => {
    const syncWithCloud = async () => {
      // Only sync once when profile is available and we haven't loaded from cloud yet
      if (!profile || !session?.user?.id || hasLoadedFromCloud) {
        return;
      }

      try {
        // Get local favorites
        const localFavorites = await loadFavoritesFromStorage();
        
        // Get cloud favorites from profile
        const cloudFavorites = profile.favorite_events || [];
        
        // Merge local and cloud favorites (migration on login)
        const mergedFavorites = mergeFavorites(localFavorites, cloudFavorites);
        
        // Update state
        setFavoriteEventIds(mergedFavorites);
        
        // Save merged favorites to both storage and cloud
        await saveFavoritesToStorage(mergedFavorites);
        await syncFavoritesToSupabase(session.user.id, mergedFavorites);
        
        setHasLoadedFromCloud(true);
        console.log('✅ Favorites synced with cloud:', mergedFavorites.length, 'total favorites');
      } catch (error) {
        console.error('Error syncing favorites with cloud:', error);
      }
    };

    syncWithCloud();
  }, [profile, session, hasLoadedFromCloud]);

  // Reset cloud sync flag when user logs out
  useEffect(() => {
    if (!session) {
      setHasLoadedFromCloud(false);
    }
  }, [session]);

  const isFavorite = useCallback((eventId: string): boolean => {
    return favoriteEventIds.includes(eventId);
  }, [favoriteEventIds]);

  const toggleFavorite = useCallback(async (eventId: string): Promise<void> => {
    try {
      let newFavorites: string[];
      
      if (favoriteEventIds.includes(eventId)) {
        // Remove from favorites
        newFavorites = favoriteEventIds.filter(id => id !== eventId);
      } else {
        // Add to favorites
        newFavorites = [...favoriteEventIds, eventId];
      }
      
      // Update state immediately for responsive UI
      setFavoriteEventIds(newFavorites);
      
      // Save to AsyncStorage
      await saveFavoritesToStorage(newFavorites);
      
      // If user is authenticated, sync to Supabase
      if (session?.user?.id) {
        await syncFavoritesToSupabase(session.user.id, newFavorites);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert state on error
      const currentFavorites = await loadFavoritesFromStorage();
      setFavoriteEventIds(currentFavorites);
    }
  }, [favoriteEventIds, session]);

  const value: FavoritesContextType = {
    favoriteEventIds,
    isFavorite,
    toggleFavorite,
    loading,
  };

  return (
    <FavoritesContext.Provider value={value}>
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
