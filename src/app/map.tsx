import { StatusBar, StyleSheet, View } from "react-native";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useCityLocation } from "../context/CityContext";
import type { Event } from "../types/events";
import { useRouter } from 'expo-router';
import MapViewComponent from "../components/MapViewComponent";
import { useEventsQuery } from "../hooks/queries/useEventsQuery";

export default function MapRoute() {
    const { theme, isDark } = useTheme();
    const { selectedCity } = useCityLocation();
    const router = useRouter();

    // Fetch events for the map
    const { data: events = [], isLoading } = useEventsQuery(selectedCity);

    const handleEventPress = (event: Event) => {
        router.push(`/event/${event.id}`);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={theme.colors.background.primary}
            />
            <MapViewComponent
                events={events}
                onEventPress={handleEventPress}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
