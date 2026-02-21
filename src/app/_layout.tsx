import { useFonts } from 'expo-font';
import { Stack, usePathname, useSegments } from 'expo-router';
import Head from 'expo-router/head';
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
import BottomTabBar from "../components/BottomTabBar";
import { View, Platform } from 'react-native';
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

    // Inject Google Analytics on web (for dev server; production uses inject-head.js)
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (document.querySelector('script[src*="googletagmanager"]')) return;

        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-SK3E86M5F8';
        script.async = true;
        document.head.appendChild(script);

        const inlineScript = document.createElement('script');
        inlineScript.textContent = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SK3E86M5F8', { send_page_view: false });
        `;
        document.head.appendChild(inlineScript);
    }, []);

    // Inject Microsoft Clarity on web (for dev server; production uses inject-head.js)
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (document.querySelector('script[src*="clarity.ms"]')) return;

        const script = document.createElement('script');
        script.textContent = `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vkzkf8j9n8");
        `;
        document.head.appendChild(script);
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
            <Head>
                <meta name="impact-site-verification" {...{ value: "69cc4690-1595-47a6-9724-1c86ad3258b6" } as any} />
            </Head>
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

// Routes that should show onboarding (browsing routes)
const ONBOARDING_ROUTES = ['/', '/index', '/map', '/home', '/friends'];

// Separate this into a new component so it can access the SessionProvider context later
function RootNavigator() {
    const { isLoggedIn, session } = useAuth();
    const { isMobile, isTablet } = useDeviceInfo();
    const pathname = usePathname();
    const segments = useSegments();
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Track client-side route changes in Google Analytics
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (typeof window.gtag !== 'function') return;

        window.gtag('event', 'page_view', {
            page_path: pathname,
            page_location: window.location.href,
            page_title: document.title,
        });
    }, [pathname]);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

    // Check if current route is a deep-link route that should SKIP onboarding
    const isDeepLinkRoute = () => {
        const firstSegment = segments[0];
        return ['event', 'venue', 'invite', 'user', 'auth'].includes(firstSegment);
    };

    // Check if user has completed onboarding
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
                const isCompleted = completed === 'true';
                setOnboardingCompleted(isCompleted);

                // Check if city was already inferred from a deep link
                const cityInferred = await AsyncStorage.getItem(STORAGE_KEYS.DEEP_LINK_CITY_INFERRED);

                // Only show onboarding if:
                // 1. Not completed
                // 2. Not logged in
                // 3. Not on a deep-link route
                // 4. City not already inferred from deep link
                // 5. On a browsing route
                const shouldShow = !isCompleted &&
                                  !session &&
                                  !isDeepLinkRoute() &&
                                  !cityInferred &&
                                  ONBOARDING_ROUTES.includes(pathname);

                setShowOnboarding(shouldShow);
            } catch (error) {
                logger.error('Error checking onboarding status:', error);
                setOnboardingCompleted(false);
            }
        };
        checkOnboarding();
    }, [session, pathname, segments]);

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

    const renderHeader = useCallback((props: any) => (
        <Header {...props} />
    ), []);

    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    header: renderHeader
                }}
                initialRouteName="home"
            >
                <Stack.Protected guard={isLoggedIn}>
                    <Stack.Screen name="(private)" options={{ headerShown: false }} />
                </Stack.Protected>
                <Stack.Protected guard={!isLoggedIn}>
                    <Stack.Screen name="user/signin" />
                </Stack.Protected>
            </Stack>
            {Platform.OS !== 'web' && (isMobile || isTablet) && <BottomTabBar />}
            <OnboardingModal visible={showOnboarding} onComplete={handleOnboardingComplete} />
        </View>
    );
}