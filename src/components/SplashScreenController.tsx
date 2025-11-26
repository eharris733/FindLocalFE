import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuth } from "../hooks/useAuth";
import { logger } from "../utils/logger";

export function SplashScreenController() {
    const { isLoading } = useAuth();
    
    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync().catch((error) => {
                logger.warn('SplashScreen.hideAsync failed in controller:', error);
            });
        }
    }, [isLoading]);
    
    return null;
}
