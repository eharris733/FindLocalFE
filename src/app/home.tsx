import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { HomePageContent } from '../components/home';
import type { Event } from '../types/events';

export default function HomeRoute() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleEventPress = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <HomePageContent onEventPress={handleEventPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
