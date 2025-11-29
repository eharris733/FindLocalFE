import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface TimeTrackingOptions {
  onTimeUpdate?: (durationMs: number) => void;
  onEnd?: (durationMs: number) => void;
  minDuration?: number; // Minimum duration to track (ms)
}

/**
 * Hook to track time spent on a component/screen
 * Returns the current duration in milliseconds
 */
export function useTimeTracking(options: TimeTrackingOptions = {}) {
  const { onTimeUpdate, onEnd, minDuration = 0 } = options;
  const [duration, setDuration] = useState(0);
  const startTime = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Start tracking
    startTime.current = Date.now();

    // Update duration every second
    intervalRef.current = setInterval(() => {
      if (startTime.current) {
        const currentDuration = Date.now() - startTime.current;
        setDuration(currentDuration);
        onTimeUpdate?.(currentDuration);
      }
    }, 1000);

    // Handle app state changes (pause tracking when app is backgrounded)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App went to background - pause tracking
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - resume tracking
        if (!intervalRef.current && startTime.current) {
          intervalRef.current = setInterval(() => {
            if (startTime.current) {
              const currentDuration = Date.now() - startTime.current;
              setDuration(currentDuration);
              onTimeUpdate?.(currentDuration);
            }
          }, 1000);
        }
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();

      // Calculate final duration
      if (startTime.current) {
        const finalDuration = Date.now() - startTime.current;
        if (finalDuration >= minDuration) {
          onEnd?.(finalDuration);
        }
      }
    };
  }, []);

  return duration;
}

/**
 * Hook to track time spent viewing a modal
 * Returns a function to call when the modal is closed
 */
export function useModalTimeTracking() {
  const startTime = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);
  const pausedTime = useRef<number>(0);
  const lastPauseTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = Date.now();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App went to background - record pause time
        lastPauseTime.current = Date.now();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - add to paused time
        if (lastPauseTime.current) {
          pausedTime.current += Date.now() - lastPauseTime.current;
          lastPauseTime.current = null;
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const getDuration = (): number => {
    if (!startTime.current) return 0;
    
    // Calculate active time (total time - paused time)
    const totalTime = Date.now() - startTime.current;
    const activePausedTime = lastPauseTime.current 
      ? pausedTime.current + (Date.now() - lastPauseTime.current)
      : pausedTime.current;
    
    return Math.max(0, totalTime - activePausedTime);
  };

  return { getDuration };
}

/**
 * Hook to track cumulative time across multiple sessions
 */
export function useCumulativeTimeTracking(storageKey: string) {
  const [totalTime, setTotalTime] = useState(0);
  const sessionStartTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update total time every 5 seconds
    intervalRef.current = setInterval(() => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      setTotalTime(prev => prev + sessionDuration);
      sessionStartTime.current = Date.now();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Add final session duration
      const finalSessionDuration = Date.now() - sessionStartTime.current;
      setTotalTime(prev => prev + finalSessionDuration);
    };
  }, []);

  return totalTime;
}
