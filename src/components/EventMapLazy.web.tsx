import React, { Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Web: load the map (and with it @teovilla/react-native-web-maps, the Google
 * Maps loader and CustomMapMarker) as a separate chunk on first use. The list
 * view is the landing experience, so none of that belongs in the entry bundle.
 * Expo's web exporter emits `import()` boundaries as separate files under
 * dist/_expo/static/js/web/.
 */
const EventMap = React.lazy(() => import('./EventMap'));

type Props = React.ComponentProps<typeof EventMap>;

export default function EventMapLazy(props: Props) {
  const { theme } = useTheme();
  return (
    <Suspense
      fallback={
        <View style={styles.fallback}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      }
    >
      <EventMap {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    minHeight: 600,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
