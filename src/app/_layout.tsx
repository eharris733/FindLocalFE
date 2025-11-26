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
import {ThemeProvider} from "../context/ThemeContext";
import {FavoritesProvider} from "../context/FavoritesContext";
import Header from "../components/Header";
import {useAuth} from "../hooks/useAuth";
import AuthProvider from "../providers/auth-provider";
import {SplashScreenController} from "../components/SplashScreenController";
import { logger } from "../utils/logger";
import FeedbackBanner from "../components/FeedbackBanner";
import FeedbackModal from "../components/FeedbackModal";
import { View } from 'react-native';
import { analytics } from '../utils/analytics';

SplashScreen.preventAutoHideAsync();

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
            SplashScreen.hideAsync();
        }
        
        return () => clearTimeout(timeout);
    }, [fontsLoaded, fontError, fontTimeout]);

    // error state

    return (
        <ThemeProvider>
            <AuthProvider>
                <CityProvider>
                    <FavoritesProvider>
                        <SplashScreenController />
                        <RootNavigator />
                    </FavoritesProvider>
                </CityProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

// Separate this into a new component so it can access the SessionProvider context later
function RootNavigator() {
    const { isLoggedIn } = useAuth();
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
            <FeedbackBanner onFeedbackPress={handleFeedbackPress} />
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
                <Stack.Screen name="+not-found" />
            </Stack>
            <FeedbackModal visible={showFeedbackModal} onClose={handleCloseFeedback} />
        </View>
    );
}