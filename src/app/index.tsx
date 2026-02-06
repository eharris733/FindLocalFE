import { StatusBar, StyleSheet, View, ActivityIndicator } from "react-native";
import { DiscoverPageContent } from "../components/DiscoverPageContent";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useCityLocation } from "../context/CityContext";
import type { Event } from "../types/events";
import { analytics } from '../utils/analytics';
import { useFocusEffect } from '@react-navigation/native';
import { StructuredData } from '../components/StructuredData';
import { useRouter } from 'expo-router';

export default function IndexRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity } = useCityLocation();
    const router = useRouter();
    const [shouldRenderContent, setShouldRenderContent] = React.useState(false);

    // Defer rendering the heavy component until after navigation completes
    React.useEffect(() => {
        // Use requestAnimationFrame to ensure navigation is complete
        const frame = requestAnimationFrame(() => {
            setShouldRenderContent(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // Track page views when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            analytics.trackPageView('/', {
                city: selectedCity,
            });
        }, [selectedCity])
    );

    // Track city changes
    React.useEffect(() => {
        analytics.trackCityChange(selectedCity);
    }, [selectedCity]);

    const handleEventPress = (event: Event) => {
        router.push(`/event/${event.id}`);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
            <StructuredData city={selectedCity} />
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={theme.colors.background.primary}
            />
            {shouldRenderContent ? (
                <DiscoverPageContent
                    onEventPress={handleEventPress}
                />
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
