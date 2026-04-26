import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import {
  Epilogue_400Regular,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
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
  const [fontsLoaded, fontError] = useFonts({
    Epilogue_400Regular,
    Epilogue_600SemiBold,
    Epilogue_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    if (!document.querySelector('script[src*="googletagmanager"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-SK3E86M5F8';
      script.async = true;
      document.head.appendChild(script);
      const inline = document.createElement('script');
      inline.textContent = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-SK3E86M5F8', { send_page_view: false });`;
      document.head.appendChild(inline);
    }

    if (!document.querySelector('script[data-clarity]')) {
      const script = document.createElement('script');
      script.dataset.clarity = 'true';
      script.textContent = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "vkzkf8j9n8");`;
      document.head.appendChild(script);
    }

    if (!document.querySelector('link[data-material-symbols]')) {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://fonts.gstatic.com';
      preconnect.crossOrigin = '';
      document.head.appendChild(preconnect);
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href =
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap';
      stylesheet.dataset.materialSymbols = 'true';
      document.head.appendChild(stylesheet);
    }
  }, []);

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

function RootNavigator() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (typeof w.gtag !== 'function') return;
    w.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: w.location.href,
      page_title: document.title,
    });
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
