import {useCityLocation} from "../context/CityContext";
import {useEvents} from "../hooks/useEvents";
import {Text} from "../components/ui";
import {SafeAreaView, StatusBar, StyleSheet} from "react-native";
import MainLayout from "../components/MainLayout";
import VenueModal from "../components/VenueModal";
import React, {useState} from "react";
import {useTheme} from "../context/ThemeContext";
import type {Event} from "../types/events";

export default function IndexRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity} = useCityLocation();
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showVenueModal, setShowVenueModal] = useState(false);

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
    } = useEvents({ selectedCity });

    const handleEventPress = (event: Event) => {
        setSelectedEvent(event);
        setShowVenueModal(true);
    };

    const handleCloseVenueModal = () => {
        setShowVenueModal(false);
        setSelectedEvent(null);
    };

    return (    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={theme.colors.background.primary}
        />
        <MainLayout
            events={filteredEvents}
            filters={filters}
            dispatchFilters={dispatchFilters}
            availableCategories={availableCategories}
            availableLocations={availableLocations}
            venues={venues}
            venuesLoading={venuesLoading}
            onEventPress={handleEventPress}
        />

        {/* Venue Modal */}
        <VenueModal
            visible={showVenueModal}
            event={selectedEvent}
            onClose={handleCloseVenueModal}
        />
    </SafeAreaView>);
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