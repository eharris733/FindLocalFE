import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';

const APP_STORE_URL = 'https://apps.apple.com/app/findlocal'; // TODO: Update with real URL
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.findlocal'; // TODO: Update with real URL

export const GetAppBanner: React.FC = () => {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const handleGetApp = () => {
    // Detect if iOS or Android based on user agent (we're on mobile web)
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const url = isIOS ? APP_STORE_URL : PLAY_STORE_URL;

    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.accent[500] }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📱</Text>
        <Text variant="body2" style={[styles.text, { color: theme.colors.text.inverse }]}>
          Get the app for notifications
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.getButton, { backgroundColor: theme.colors.background.primary }]}
          onPress={handleGetApp}
        >
          <Text variant="label" style={{ color: theme.colors.accent[600] }}>
            Get App
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: theme.colors.text.inverse, fontSize: 18 }}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  text: {
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  getButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissButton: {
    padding: 4,
  },
});
