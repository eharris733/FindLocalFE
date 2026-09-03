import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CityProvider } from '../context/CityContext';
import { ThemeProvider } from '../context/ThemeContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { FiltersProvider } from '../context/FiltersContext';
import { SplashScreenController } from '../components/SplashScreenController';
import Header from '../components/Header';
import { logger } from '../utils/logger';
import { CANONICAL_ORIGIN } from '../constants/site';
import { FONT_MAP } from '../theme/fonts';

SplashScreen.preventAutoHideAsync().catch((error) => {
  logger.warn('SplashScreen.preventAutoHideAsync failed:', error);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

const renderHeader = () => <Header />;

export default function RootLayout() {
  const [fontTimeout, setFontTimeout] = useState(false);
  // Native loads the Google Fonts .ttf files here. On web FONT_MAP is empty
  // (src/theme/fonts.web.ts): the faces are self-hosted woff2 declared via
  // @font-face in scripts/inject-head.js, so the browser's preload scanner
  // discovers them from the HTML instead of waiting for the bundle.
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded && !fontError) {
        logger.warn('Font loading timeout - proceeding with fallback fonts');
        setFontTimeout(true);
      }
    }, 10000);

    if (fontsLoaded || fontError || fontTimeout) {
      SplashScreen.hideAsync().catch((error) => {
        logger.warn('SplashScreen.hideAsync failed:', error);
      });
    }

    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError, fontTimeout]);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta
          name="impact-site-verification"
          {...({ value: '69cc4690-1595-47a6-9724-1c86ad3258b6' } as any)}
        />
      </Head>
      <SafeAreaProvider>
        <ThemeProvider>
          <CityProvider>
            <FavoritesProvider>
              <FiltersProvider>
                <SplashScreenController />
                <RootNavigator />
              </FiltersProvider>
            </FavoritesProvider>
          </CityProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Keep in sync with the server-rendered titles in functions/*.ts so the
// hydrated DOM agrees with the initial HTML.
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Find Local — Discover Local Events: Concerts, Comedy, Theater & More',
  '/saved': 'Saved · Find Local',
  '/venues': 'Browse Local Venues | Find Local',
  '/about': 'About Find Local | Local Event Discovery',
  '/privacy': 'Privacy Policy | Find Local',
  '/terms': 'Terms of Service | Find Local',
  '/filters': 'Filters · Find Local',
};

function RootNavigator() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Event and venue detail pages set their own SEO-friendly titles.
    if (pathname.startsWith('/event/') || pathname.startsWith('/venue/')) return;
    document.title = ROUTE_TITLES[pathname] ?? 'Find Local';
  }, [pathname]);

  // Every route declares a canonical (query params stripped, so /?view=map
  // folds into /), and user-specific screens are noindexed. Detail pages get
  // the same tags server-side from the Pages Functions; this keeps the
  // rendered DOM in agreement during client navigation.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const cleanPath = pathname === '/index' ? '/' : pathname;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    // Always the production origin — window.location.origin would make www/
    // preview-host variants self-canonicalise. Detail-page ids are lowercased
    // to match the server-side 301 normalisation.
    const canonicalPath =
      cleanPath.startsWith('/event/') || cleanPath.startsWith('/venue/')
        ? cleanPath.toLowerCase()
        : cleanPath;
    canonical.href = `${CANONICAL_ORIGIN}${canonicalPath}`;

    const noindex = cleanPath === '/saved' || cleanPath === '/filters' || cleanPath === '/map';
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = noindex ? 'noindex, follow' : 'index, follow';
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ header: renderHeader }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="map" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="venues" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="venue/[id]" />
        <Stack.Screen name="about" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen
          name="filters"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </View>
  );
}
