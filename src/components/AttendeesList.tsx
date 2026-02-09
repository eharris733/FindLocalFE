// src/components/AttendeesList.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Text, Avatar, AvatarGroup } from './ui';
import { RsvpWithProfile } from '../api/invitations';

interface AttendeesListProps {
  attendees: RsvpWithProfile[];
  goingCount: number;
  maybeCount: number;
  maxDisplay?: number;
  onViewAll?: () => void;
  compact?: boolean;
}

export function AttendeesList({
  attendees,
  goingCount,
  maybeCount,
  maxDisplay = 5,
  onViewAll,
  compact = false,
}: AttendeesListProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const goingAttendees = attendees.filter((a) => a.response === 'yes');
  const maybeAttendees = attendees.filter((a) => a.response === 'maybe');

  const handleProfilePress = (username?: string | null) => {
    if (username) {
      router.push(`/user/${username}`);
    }
  };

  if (goingCount === 0 && maybeCount === 0) {
    return null;
  }

  // Compact mode - just show avatar group and counts
  if (compact) {
    const avatarData = attendees.slice(0, 4).map((a) => ({
      imageUrl: a.avatar_url,
      name: a.full_name || a.username,
    }));

    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: theme.colors.background.secondary, borderRadius: theme.borderRadius.md }]}
        onPress={onViewAll}
        disabled={!onViewAll}
      >
        <AvatarGroup
          avatars={avatarData}
          max={4}
          size="sm"
          extraCount={goingCount + maybeCount - Math.min(4, attendees.length)}
        />
        <View style={styles.compactTextContainer}>
          <Text variant="body2" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
            {goingCount > 0 ? `${goingCount} going` : ''}
            {goingCount > 0 && maybeCount > 0 ? ' · ' : ''}
            {maybeCount > 0 ? `${maybeCount} maybe` : ''}
          </Text>
        </View>
        {onViewAll && (
          <Text variant="body2" style={{ color: theme.colors.primary[500] }}>
            View all →
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Full mode - show list with names
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary, borderRadius: theme.borderRadius.md }]}>
      <Text variant="h4" style={{ color: theme.colors.text.primary, marginBottom: 16 }}>
        Who's Going
      </Text>

      {/* Going section */}
      {goingAttendees.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="body2" style={{ color: theme.colors.success, fontWeight: '600' }}>
              Going ({goingCount})
            </Text>
          </View>
          {goingAttendees.slice(0, maxDisplay).map((attendee) => (
            <TouchableOpacity
              key={attendee.rsvp_id}
              style={styles.attendeeRow}
              onPress={() => handleProfilePress(attendee.username)}
              disabled={!attendee.username}
            >
              <Avatar
                imageUrl={attendee.avatar_url}
                name={attendee.full_name || attendee.username}
                size="sm"
              />
              <View style={styles.attendeeInfo}>
                <Text variant="body2" style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                  {attendee.full_name || attendee.username || 'Unknown'}
                </Text>
                {attendee.username && (
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                    @{attendee.username}
                  </Text>
                )}
              </View>
              {attendee.plus_one_count > 0 && (
                <Text variant="caption" style={{ color: theme.colors.text.secondary }}>
                  +{attendee.plus_one_count}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Maybe section */}
      {maybeAttendees.length > 0 && (
        <View style={[styles.section, { marginTop: 16 }]}>
          <View style={styles.sectionHeader}>
            <Text variant="body2" style={{ color: theme.colors.warning, fontWeight: '600' }}>
              Maybe ({maybeCount})
            </Text>
          </View>
          {maybeAttendees.slice(0, maxDisplay).map((attendee) => (
            <TouchableOpacity
              key={attendee.rsvp_id}
              style={styles.attendeeRow}
              onPress={() => handleProfilePress(attendee.username)}
              disabled={!attendee.username}
            >
              <Avatar
                imageUrl={attendee.avatar_url}
                name={attendee.full_name || attendee.username}
                size="sm"
              />
              <View style={styles.attendeeInfo}>
                <Text variant="body2" style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                  {attendee.full_name || attendee.username || 'Unknown'}
                </Text>
                {attendee.username && (
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
                    @{attendee.username}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* View all button */}
      {onViewAll && (goingCount + maybeCount > maxDisplay * 2) && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text variant="body2" style={{ color: theme.colors.primary[500], fontWeight: '600' }}>
            View all attendees →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  compactTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  section: {},
  sectionHeader: {
    marginBottom: 12,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  viewAllButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
