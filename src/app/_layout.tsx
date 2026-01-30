import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, {useEffect, useState, useCallback} from 'react';
import {
    WorkSans_300Light,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold, WorkSans_700Bold
} from "@expo-google-fonts/work-sans";
import {CityProvider} from "../context/CityContext";
import {CommunityProvider} from "../context/CommunityContext";
import {ThemeProvider} from "../context/ThemeContext";
import {FavoritesProvider} from "../context/FavoritesContext";
import {FriendsProvider} from "../context/FriendsContext";
import Header from "../components/Header";
import {useAuth} from "../hooks/useAuth";
import AuthProvider from "../providers/auth-provider";
import {SplashScreenController} from "../components/SplashScreenController";
import { logger } from "../utils/logger";
import FeedbackModal from "../components/FeedbackModal";
import BottomTabBar from "../components/BottomTabBar";
import { View, Platform } from 'react-native';
import { analytics } from '../utils/analytics';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OnboardingModal from '../components/OnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { updateInterests, updatePreferredCity } from '../api/profiles';

// Prevent auto hide with error handling for Expo Go
SplashScreen.preventAutoHideAsync().catch((error) => {
    logger.warn('SplashScreen.preventAutoHideAsync failed:', error);
});

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    },
  },
});

export default function RootLayout() {
    const [fontTimeout, setFontTimeout] = useState(false);
    const [fontsLoaded, fontError] = useFonts({
        WorkSans_300Light,
        WorkSans_400Regular,
        WorkSans_500Medium,
        WorkSans_600SemiBold,
        WorkSans_700Bold,
    });

    useEffect(() => {
        // Initialize analytics
        analytics.initialize().catch(err => {
            logger.error('Failed to initialize analytics:', err);
        });
        
        // Cleanup on unmount
        return () => {
            analytics.cleanup().catch(err => {
                logger.error('Failed to cleanup analytics:', err);
            });
        };
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!fontsLoaded && !fontError) {
                logger.warn('Font loading timeout - proceeding with fallback fonts');
                setFontTimeout(true);
            }
        }, 10000); // 10 second timeout

        // Hide splash screen when fonts are loaded or on timeout/error
        if (fontsLoaded || fontError || fontTimeout) {
            SplashScreen.hideAsync().catch((error) => {
                logger.warn('SplashScreen.hideAsync failed:', error);
            });
        }
        
        return () => clearTimeout(timeout);
    }, [fontsLoaded, fontError, fontTimeout]);

    // error state

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <CityProvider>
                        <CommunityProvider>
                            <FavoritesProvider>
                                <FriendsProvider>
                                    <SplashScreenController />
                                    <RootNavigator />
                                </FriendsProvider>
                            </FavoritesProvider>
                        </CommunityProvider>
                    </CityProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

// Separate this into a new component so it can access the SessionProvider context later
function RootNavigator() {
    const { isLoggedIn, session } = useAuth();
    const { isMobile, isTablet } = useDeviceInfo();
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

    // Check if user has completed onboarding
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
                const isCompleted = completed === 'true';
                setOnboardingCompleted(isCompleted);

                // Show onboarding if not completed and not logged in
                if (!isCompleted && !session) {
                    setShowOnboarding(true);
                }
            } catch (error) {
                logger.error('Error checking onboarding status:', error);
                setOnboardingCompleted(false);
            }
        };
        checkOnboarding();
    }, [session]);

    const handleOnboardingComplete = useCallback(async (selectedInterests?: string[]) => {
        try {
            setLoading(true);

            // Mark onboarding as completed
            setOnboardingCompleted(true);

            // Save interests locally
            if (selectedInterests && selectedInterests.length > 0) {
                await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedInterests));
            }

            // If user just signed in via OAuth, save preferences to their profile
            if (session?.user?.id && selectedInterests) {
                const savedCity = await AsyncStorage.getItem(STORAGE_KEYS.PREFERRED_CITY);
                if (savedCity) {
                    // Save city and interests to profile to prevent profile sync from overriding
                    await Promise.all([
                        updatePreferredCity(session.user.id, savedCity),
                        selectedInterests.length > 0 ? updateInterests(session.user.id, selectedInterests) : Promise.resolve(),
                    ]);
                    logger.info('✅ Saved onboarding preferences to profile:', { city: savedCity, interests: selectedInterests });
                }
            }

            setShowOnboarding(false);
            setLoading(false);
        } catch (error) {
            logger.error('Error saving onboarding data:', error);
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            setLoading(false);
        }
    }, [session]);

    const [loading, setLoading] = useState(false);

    const handleFeedbackPress = useCallback(() => {
        setShowFeedbackModal(true);
    }, []);

    const handleCloseFeedback = useCallback(() => {
        setShowFeedbackModal(false);
    }, []);

    const renderHeader = useCallback((props: any) => (
        <Header onFeedbackPress={handleFeedbackPress} {...props} />
    ), [handleFeedbackPress]);

    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    header: renderHeader
                }}
                initialRouteName="index"
            >
                <Stack.Protected guard={isLoggedIn}>
                    <Stack.Screen name="(private)" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={!isLoggedIn}>
                    <Stack.Screen name="user/signin" />
                </Stack.Protected>
            </Stack>
            {Platform.OS !== 'web' && (isMobile || isTablet) && <BottomTabBar />}
            <FeedbackModal visible={showFeedbackModal} onClose={handleCloseFeedback} />
            <OnboardingModal visible={showOnboarding} onComplete={handleOnboardingComplete} />
        </View>
    );
}