// src/utils/linkUtils.ts
import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { logger } from './logger';

export interface OpenLinkOptions {
  /**
   * Force external browser even on supported platforms
   */
  forceExternal?: boolean;
  /**
   * Color for the browser toolbar (Android only)
   */
  toolbarColor?: string;
  /**
   * Color for secondary toolbar (Android only)
   */
  secondaryToolbarColor?: string;
  /**
   * Enable the reader mode button (iOS only)
   */
  enableReaderMode?: boolean;
  /**
   * Enable bar collapsing (Android only)
   */
  enableBarCollapsing?: boolean;
}

/**
 * Opens a URL in an in-app browser on native platforms,
 * or in a new tab on web.
 */
export async function openLink(url: string, options: OpenLinkOptions = {}): Promise<void> {
  const { forceExternal = false, toolbarColor, secondaryToolbarColor } = options;

  // Validate URL
  if (!url || typeof url !== 'string') {
    logger.warn('openLink called with invalid URL:', url);
    return;
  }

  // Ensure URL has protocol
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = `https://${url}`;
  }

  try {
    // On web, always use Linking (opens in new tab)
    if (Platform.OS === 'web') {
      await Linking.openURL(fullUrl);
      return;
    }

    // For special URL schemes (tel:, mailto:, maps:, etc.), use Linking
    if (forceExternal || isSpecialScheme(fullUrl)) {
      await Linking.openURL(fullUrl);
      return;
    }

    // Use in-app browser for http/https URLs on native
    await WebBrowser.openBrowserAsync(fullUrl, {
      toolbarColor,
      secondaryToolbarColor,
      enableBarCollapsing: true,
      showTitle: true,
      // iOS specific
      readerMode: options.enableReaderMode,
      dismissButtonStyle: 'close',
      // Android specific
      showInRecents: true,
    });
  } catch (error) {
    logger.error('Error opening link:', error);
    // Fallback to Linking if WebBrowser fails
    try {
      await Linking.openURL(fullUrl);
    } catch (fallbackError) {
      logger.error('Fallback link opening failed:', fallbackError);
    }
  }
}

/**
 * Opens a maps URL for an address
 */
export async function openMaps(address: string): Promise<void> {
  const encodedAddress = encodeURIComponent(address);

  // Platform-specific maps URL
  const mapsUrl = Platform.select({
    ios: `maps:0,0?q=${encodedAddress}`,
    android: `geo:0,0?q=${encodedAddress}`,
    default: `https://maps.google.com/?q=${encodedAddress}`,
  });

  await Linking.openURL(mapsUrl as string);
}

/**
 * Checks if URL is a special scheme that needs system handling
 */
function isSpecialScheme(url: string): boolean {
  const specialSchemes = ['tel:', 'mailto:', 'sms:', 'maps:', 'geo:', 'data:'];
  return specialSchemes.some(scheme => url.toLowerCase().startsWith(scheme));
}
