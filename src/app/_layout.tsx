import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, {useEffect, useState} from 'react';
import {
    WorkSans_300Light,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold, WorkSans_700Bold
} from "@expo-google-fonts/work-sans";
import {CityProvider} from "../context/CityContext";
import {ThemeProvider} from "../context/ThemeContext";
import Header from "../components/Header";


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

    const isLoading = (!fontsLoaded && !fontError && !fontTimeout);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!fontsLoaded && !fontError) {
                console.warn('Font loading timeout - proceeding with fallback fonts');
                setFontTimeout(true);
            }
        }, 10000); // 10 second timeout

        if (isLoading) {
           SplashScreen.hide();
        }
        return () => clearTimeout(timeout);
    }, [isLoading]);

    // error state

    return (
            <ThemeProvider>
                <CityProvider>
                    <RootNavigator />
                </CityProvider>
            </ThemeProvider>
    );
}

// Separate this into a new component so it can access the SessionProvider context later
function RootNavigator() {
    return <Stack screenOptions={{ header: Header }} initialRouteName="index"/>
}