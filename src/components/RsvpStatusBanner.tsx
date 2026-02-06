// src/components/RsvpStatusBanner.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import { EventRsvp } from '../api/invitations';

interface RsvpStatusBannerProps {
  rsvp: EventRsvp;
  inviterName?: string | null;
  onChangeResponse?: () => void;
}

export function RsvpStatusBanner({ rsvp, inviterName, onChangeResponse }: RsvpStatusBannerProps) {
  const { theme } = useTheme();

  const getStatusConfig = () => {
    switch (rsvp.response) {
      case 'yes':
        return {
          emoji: '✓',
          label: "You're going!",
          bgColor: theme.colors.success + '15',
          borderColor: theme.colors.success,
          textColor: theme.colors.success,
        };
      case 'maybe':
        return {
          emoji: '?',
          label: "You're a maybe",
          bgColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning,
          textColor: theme.colors.warning,
        };
      case 'no':
        return {
          emoji: '✗',
          label: "You're not going",
          bgColor: theme.colors.gray[100],
          borderColor: theme.colors.gray[300],
          textColor: theme.colors.text.secondary,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderRadius: theme.borderRadius.md,
        },
      ]}
    >
      <View style={styles.statusRow}>
        <View style={styles.leftContent}>
          <Text
            style={[
              styles.emoji,
              { color: config.textColor },
            ]}
          >
            {config.emoji}
          </Text>
          <View>
            <Text
              variant="body1"
              style={{ fontWeight: '600', color: config.textColor }}
            >
              {config.label}
            </Text>
            {inviterName && (
              <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                Invited by {inviterName}
              </Text>
            )}
            {rsvp.plus_one_count > 0 && (
              <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                +{rsvp.plus_one_count} guest{rsvp.plus_one_count > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {onChangeResponse && (
          <TouchableOpacity
            style={[styles.changeButton, { borderColor: config.borderColor }]}
            onPress={onChangeResponse}
          >
            <Text variant="body2" style={{ color: config.textColor, fontWeight: '600' }}>
              Change
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
    fontWeight: '700',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 20,
  },
});
