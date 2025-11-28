import {useCityLocation} from "../context/CityContext";
import {useCommunity} from "../context/CommunityContext";
import {useFavorites} from "../context/FavoritesContext";
import {useEvents} from "../hooks/useEvents";
import {StatusBar, StyleSheet, View, Text} from "react-native";
import MainLayout from "../components/MainLayout";
import React from "react";
import {useTheme} from "../context/ThemeContext";
import type {Event} from "../types/events";
import { analytics } from '../utils/analytics';
import { useFocusEffect } from '@react-navigation/native';
import { StructuredData } from '../components/StructuredData';
import { useRouter } from 'expo-router';
import { logger } from '../utils/logger';

export default function IndexRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity, selectedRegions} = useCityLocation();
    const { selectedCommunities, allCommunities } = useCommunity();
    const { favoriteEventIds } = useFavorites();
    const router = useRouter();

    const {
        loading,
        filteredEvents,
        filters,
        dispatchFilters,
        availableCategories,
        availableLocations,
        venues,
        venuesLoading,
        availableFilterOptions,
    } = useEvents({ selectedCity, favoriteEventIds });

    // Sync selectedRegions from CityContext to filters
    React.useEffect(() => {
        dispatchFilters({ type: 'SET_REGIONS', payload: selectedRegions });
    }, [selectedRegions, dispatchFilters]);

    // Sync selected communities to filters
    React.useEffect(() => {
        logger.info('🎭 Selected communities changed in index:', selectedCommunities);
        
        // Convert community names to IDs
        if (selectedCommunities.length === 0) {
            // If no communities selected, show all (empty filter)
            dispatchFilters({ type: 'SET_COMMUNITY_IDS', payload: [] });
        } else {
            const communityIds = selectedCommunities
                .map(name => allCommunities.find(c => c.name === name)?.id)
                .filter(Boolean) as string[];
            
            logger.info('🎭 Setting community IDs filter:', communityIds);
            dispatchFilters({ type: 'SET_COMMUNITY_IDS', payload: communityIds });
        }
    }, [selectedCommunities, allCommunities, dispatchFilters]);

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
        {/* Hidden H1 for SEO - positioned off-screen but accessible to search engines */}
        <Text 
            accessibilityRole="header" 
            aria-level={1}
            style={{
                position: 'absolute',
                left: -10000,
                top: 'auto',
                width: 1,
                height: 1,
                overflow: 'hidden'
            }}
        >
            Find Local Events in {selectedCity || 'Your City'}: Concerts, Comedy, Theater & More
        </Text>
        <MainLayout
            events={filteredEvents}
            loading={loading}
            filters={filters}
            dispatchFilters={dispatchFilters}
            availableCategories={availableCategories}
            availableLocations={availableLocations}
            venues={venues}
            venuesLoading={venuesLoading}
            availableFilterOptions={availableFilterOptions}
            onEventPress={handleEventPress}
        />
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