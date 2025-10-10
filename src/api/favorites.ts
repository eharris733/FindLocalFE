// src/api/favorites.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { updateFavoriteEvents } from './profiles';

/**
 * Load favorite event IDs from AsyncStorage
 */
export async function loadFavoritesFromStorage(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_EVENTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading favorites from storage:', error);
    return [];
  }
}

/**
 * Save favorite event IDs to AsyncStorage
 */
export async function saveFavoritesToStorage(favoriteEventIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_EVENTS, JSON.stringify(favoriteEventIds));
  } catch (error) {
    console.error('Error saving favorites to storage:', error);
  }
}

/**
 * Sync favorites to Supabase for authenticated users
 */
export async function syncFavoritesToSupabase(userId: string, favoriteEventIds: string[]): Promise<void> {
  try {
    const { error } = await updateFavoriteEvents(userId, favoriteEventIds);
    if (error) {
      console.error('Error syncing favorites to Supabase:', error);
    }
  } catch (error) {
    console.error('Error syncing favorites to Supabase:', error);
  }
}

/**
 * Merge local favorites with cloud favorites
 * Used when user logs in to combine any local favorites with their cloud favorites
 */
export function mergeFavorites(localFavorites: string[], cloudFavorites: string[]): string[] {
  // Use Set to avoid duplicates
  const merged = new Set([...localFavorites, ...cloudFavorites]);
  return Array.from(merged);
}
