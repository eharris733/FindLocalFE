import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Loading placeholder shaped like EventCard (16:9 image box + date, title and
 * venue bars), so the feed reserves its real layout while page 1 loads instead
 * of showing a lone spinner. Keep the spacing in step with EventCard's styles.
 */
export const EventCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const tone = { backgroundColor: theme.colors.surface.sunken };
  return (
    <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.image, tone]} />
      <View style={styles.body}>
        <View style={[styles.bar, styles.date, tone]} />
        <View style={[styles.bar, styles.title, tone]} />
        <View style={[styles.bar, styles.titleShort, tone]} />
        <View style={[styles.bar, styles.venue, tone]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  body: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  bar: {
    borderRadius: 6,
  },
  date: { height: 12, width: '30%', marginTop: 2, marginBottom: 8 },
  title: { height: 20, width: '90%', marginBottom: 8 },
  titleShort: { height: 20, width: '60%', marginBottom: 10 },
  venue: { height: 14, width: '50%' },
});

export default EventCardSkeleton;
