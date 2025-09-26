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
import {useAuth} from "../hooks/useAuth";
import AuthProvider from "../providers/auth-provider";
import {SplashScreenController} from "../components/SplashScreenController";


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
            <AuthProvider>
                <CityProvider>
                    <SplashScreenController />
                    <RootNavigator />
                </CityProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

// Separate this into a new component so it can access the SessionProvider context later
function RootNavigator() {
    const { isLoggedIn } = useAuth()
    return <Stack screenOptions={{ header: Header }} initialRouteName="index">
        <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(private)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
    </Stack>
}