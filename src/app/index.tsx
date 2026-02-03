import { StatusBar, StyleSheet, View, ActivityIndicator } from "react-native";
import FeedbackModal from "../components/FeedbackModal";
import { DiscoverPageContent } from "../components/DiscoverPageContent";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useCityLocation } from "../context/CityContext";
import type { Event } from "../types/events";
import { analytics } from '../utils/analytics';
import { useFocusEffect } from '@react-navigation/native';
import { StructuredData } from '../components/StructuredData';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function IndexRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity } = useCityLocation();
    const router = useRouter();
    const searchParams = useLocalSearchParams<{ view?: string }>();
    const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
    const [shouldRenderContent, setShouldRenderContent] = React.useState(false);

    // Determine initial view mode from query params
    const initialViewMode = searchParams.view === 'map' ? 'map' : 'list';

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

    const handleFeedbackPress = React.useCallback(() => {
        setShowFeedbackModal(true);
    }, []);

    const handleCloseFeedback = React.useCallback(() => {
        setShowFeedbackModal(false);
    }, []);

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
                    initialViewMode={initialViewMode}
                />
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
            )}
            <FeedbackModal visible={showFeedbackModal} onClose={handleCloseFeedback} />
    </View>);
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
    loadingText: {
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        marginBottom: 16,
        textAlign: 'center',
    },
    errorText: {
        textAlign: 'center',
    },
});