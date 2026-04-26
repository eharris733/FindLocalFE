import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { logger } from '../utils/logger';

export function SplashScreenController() {
  useEffect(() => {
    SplashScreen.hideAsync().catch((error) => {
      logger.warn('SplashScreen.hideAsync failed:', error);
    });
  }, []);
  return null;
}
