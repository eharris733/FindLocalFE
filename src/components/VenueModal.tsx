import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import type { Venue } from '../types/venues';
import type { Community } from '../api/communities';
import { getCompactVenueSizeLabel } from '../utils/venueUtils';
import { openLink } from '../utils/linkUtils';

interface VenueModalProps {
  visible: boolean;
  venue: Venue | null;
  onClose: () => void;
  communities?: Community[]; // Available communities
  venueCommunities?: Array<{ // Venue-community relationships
    community_id: string;
    priority?: 'high' | 'medium' | 'low' | null;
  }>;
}

export default function VenueModal({ visible, venue, onClose, communities = [], venueCommunities = [] }: VenueModalProps) {
  const { theme } = useTheme();

  // Enrich venue communities with full community data
  const enrichedCommunities = React.useMemo(() => {
    if (!venueCommunities.length || !communities.length) return [];
    
    return venueCommunities
      .map(vc => {
        const community = communities.find(c => c.id === vc.community_id);
        if (!community) return null;
        
        return {
          id: community.id,
          name: community.name,
          icon: community.metadata?.icon || '🎵',
          color: community.metadata?.color || '#6366f1',
          priority: vc.priority,
        };
      })
      .filter(Boolean);
  }, [venueCommunities, communities]);

  if (!venue) return null;

  const handleVisitWebsite = () => {
    if (venue.url) {
      openLink(venue.url);
    }
  };

  const sizeLabel = venue.venue_size ? getCompactVenueSizeLabel(venue.venue_size) : null;
  const eventTypesList = venue.event_types 
    ? (Array.isArray(venue.event_types) ? venue.event_types : [venue.event_types])
    : [];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.background.secondary }]}
            onPress={onClose}
          >
            <Text style={{ fontSize: 20, color: theme.colors.text.primary }}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={true}>
            {/* Venue image */}
            {venue.image && (
              <Image
                source={{ uri: venue.image }}
                style={[styles.venueImage, { backgroundColor: theme.colors.gray[100] }]}
                resizeMode="cover"
              />
            )}

            {/* Venue details */}
            <View style={styles.contentContainer}>
              <Text variant="h2" style={[styles.venueName, { color: theme.colors.text.primary }]}>
                {venue.name}
              </Text>
              
              {/* Venue Communities */}
              {enrichedCommunities.length > 0 && (
                <View style={[styles.communitiesSection, { marginBottom: theme.spacing.md }]}>
                  <Text variant="caption" style={{
                    color: theme.colors.text.tertiary,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    marginBottom: theme.spacing.xs,
                  }}>
                    Communities
                  </Text>
                  <View style={[styles.communityBadges, {
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: theme.spacing.xs,
                  }]}>
                    {enrichedCommunities.map((community: any) => (
                      <View
                        key={community.id}
                        style={[styles.communityBadge, {
                          backgroundColor: `${community.color}20`,
                          borderColor: community.color,
                          borderWidth: 1.5,
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: theme.spacing.xs,
                          borderRadius: theme.borderRadius.full,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }]}
                      >
                        <Text style={{ fontSize: 12 }}>{community.icon}</Text>
                        <Text variant="caption" style={{
                          color: theme.colors.text.primary,
                          fontWeight: '600',
                        }}>
                          {community.name}
                        </Text>
                        {community.priority === 'high' && (
                          <Text style={{ fontSize: 10 }}>⭐</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Address */}
              {venue.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary, flex: 1 }}>
                    {venue.address}
                  </Text>
                </View>
              )}

              {/* Location (City/Region) */}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🌆</Text>
                <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
                  {venue.city}{venue.region ? `, ${venue.region}` : ''}
                </Text>
              </View>

              {/* Venue Type */}
              {venue.type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🏢</Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
                    {venue.type}
                  </Text>
                </View>
              )}

              {/* Venue Size */}
              {sizeLabel && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📊</Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
                    {sizeLabel}
                  </Text>
                </View>
              )}

              {/* Description */}
              {venue.description && (
                <View style={styles.section}>
                  <Text variant="h3" style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                    About
                  </Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary, lineHeight: 22 }}>
                    {venue.description}
                  </Text>
                </View>
              )}

              {/* Event Types */}
              {eventTypesList.length > 0 && (
                <View style={styles.section}>
                  <Text variant="h3" style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                    Event Types
                  </Text>
                  <View style={styles.tagsContainer}>
                    {eventTypesList.map((type, index) => (
                      <View
                        key={index}
                        style={[styles.tag, { backgroundColor: theme.colors.primary[100] }]}
                      >
                        <Text
                          variant="caption"
                          style={[styles.tagText, { color: theme.colors.primary[700] }]}
                        >
                          {type}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Genres */}
              {venue.genres && (
                <View style={styles.section}>
                  <Text variant="h3" style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                    Genres
                  </Text>
                  <Text variant="body1" style={{ color: theme.colors.text.secondary }}>
                    {venue.genres}
                  </Text>
                </View>
              )}

              {/* Visit Website button */}
              {venue.url && (
                <TouchableOpacity
                  style={[styles.websiteButton, { backgroundColor: theme.colors.primary[500] }]}
                  onPress={handleVisitWebsite}
                >
                  <Text
                    variant="body1"
                    style={{ color: theme.colors.text.inverse, fontWeight: '600' }}
                  >
                    🌐 Visit Website
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  venueImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  venueName: {
    fontWeight: '700',
    marginBottom: 16,
  },
  communitiesSection: {},
  communityBadges: {},
  communityBadge: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontWeight: '600',
  },
  websiteButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
});
