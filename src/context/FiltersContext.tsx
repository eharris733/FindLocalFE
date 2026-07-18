import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FilterState, FilterAction } from '../types/events';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { logger } from '../utils/logger';

const initialState: FilterState = {
  when: 'anytime',
  customDate: null,
  categories: [],
  regions: [],
  free: false,
  paid: false,
  maxPrice: null,
  timeOfDay: [],
  query: '',
};

const reducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_WHEN':
      return { ...state, when: action.payload };
    case 'SET_CUSTOM_DATE':
      return { ...state, customDate: action.payload, when: 'custom' };
    case 'TOGGLE_CATEGORY': {
      const has = state.categories.includes(action.payload);
      return {
        ...state,
        categories: has
          ? state.categories.filter((c) => c !== action.payload)
          : [...state.categories, action.payload],
      };
    }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'TOGGLE_REGION': {
      const has = state.regions.includes(action.payload);
      return {
        ...state,
        regions: has
          ? state.regions.filter((r) => r !== action.payload)
          : [...state.regions, action.payload],
      };
    }
    case 'SET_REGIONS':
      return { ...state, regions: action.payload };
    case 'SET_FREE':
      return { ...state, free: action.payload };
    case 'SET_PAID':
      return { ...state, paid: action.payload };
    case 'SET_MAX_PRICE':
      return { ...state, maxPrice: action.payload };
    case 'TOGGLE_TIME_OF_DAY': {
      const has = state.timeOfDay.includes(action.payload);
      return {
        ...state,
        timeOfDay: has
          ? state.timeOfDay.filter((t) => t !== action.payload)
          : [...state.timeOfDay, action.payload],
      };
    }
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'RESET':
      return initialState;
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

interface FiltersContextType {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.FILTERS);
        if (!raw) return;
        // Search is session-only: drop any query that snuck into storage so a
        // forgotten search never silently empties the feed on next visit.
        const { query: _query, ...parsed } = JSON.parse(raw);
        const customDate = parsed.customDate ? new Date(parsed.customDate) : null;
        dispatch({ type: 'HYDRATE', payload: { ...parsed, customDate } });
      } catch (err) {
        logger.warn('Could not hydrate filters:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const { query: _query, ...persisted } = filters;
    AsyncStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(persisted)).catch(() => {});
  }, [filters]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = useMemo(() => ({ filters, dispatch, reset }), [filters, reset]);
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
};

export const useFilters = (): FiltersContextType => {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within a FiltersProvider');
  return ctx;
};
