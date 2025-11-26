import {useCityLocation} from "../context/CityContext";
import {useFavorites} from "../context/FavoritesContext";
import {useEvents} from "../hooks/useEvents";
import {StatusBar, StyleSheet, View} from "react-native";
import MainLayout from "../components/MainLayout";
import EventModal from "../components/EventModal";
import React, {useState} from "react";
import {useTheme} from "../context/ThemeContext";
import type {Event} from "../types/events";
import { analytics } from '../utils/analytics';
import { useFocusEffect } from '@react-navigation/native';

export default function IndexRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity, selectedRegions} = useCityLocation();
    const { favoriteEventIds } = useFavorites();
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);

    const {
        loading,
        error,
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
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    const handleCloseEventModal = () => {
        setShowEventModal(false);
        setSelectedEvent(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={theme.colors.background.primary}
        />
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

        {/* Event Modal */}
        <EventModal
            visible={showEventModal}
            event={selectedEvent}
            onClose={handleCloseEventModal}
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