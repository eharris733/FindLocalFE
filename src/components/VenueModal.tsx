import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import type { Venue } from '../types/venues';
import type { Event } from '../types/events';
import { getVenueByName, getVenueById } from '../api/venues';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface VenueModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const VenueModal: React.FC<VenueModalProps> = ({ visible, event, onClose }) => {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && event) {
      fetchVenueData();
    }
  }, [visible, event]);

  const fetchVenueData = async () => {
    if (!event) return;

    setLoading(true);
    setError(null);
    setVenue(null);

    try {
      let venueData = null;

      // Try to fetch by venue_id first, then fall back to name
      if (event.venue_id) {
        venueData = await getVenueById(event.venue_id);
      }
      
      if (!venueData && event.venue_name) {
        venueData = await getVenueByName(event.venue_name);
      }

      if (venueData) {
        setVenue(venueData);
      } else {
        setError('Venue information not found');
      }
    } catch (err) {
      console.error('Error fetching venue:', err);
      setError('Failed to load venue information');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueWebsite = () => {
    if (venue?.url) {
      Linking.openURL(venue.url);
    }
  };

  const handleEventLink = () => {
    if (event?.url) {
      Linking.openURL(event.url);
    }
  };

  const handleAddressPress = () => {
    if (venue?.address) {
      const encodedAddress = encodeURIComponent(venue.address);
      const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      Linking.openURL(mapsUrl);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Venue Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading venue information...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>😔 {error}</Text>
              <Text style={styles.errorSubtext}>
                We couldn't find detailed information for this venue.
              </Text>
            </View>
          )}

          {venue && (
            <View style={styles.content}>
              {/* Venue Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: venue.image_url || 'https://via.placeholder.com/400x200/63BAAB/FFFFFF?text=Venue'
                  }}
                  style={styles.venueImage}
                  resizeMode="cover"
                />
                
                {/* Venue Type Badge */}
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{venue.venue_type}</Text>
                </View>
              </View>

              {/* Venue Info */}
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{venue.name}</Text>
                
                {venue.address && (
                  <TouchableOpacity 
                    style={styles.addressContainer}
                    onPress={handleAddressPress}
                  >
                    <Text style={styles.addressLabel}>📍 Address</Text>
                    <Text style={styles.address}>{venue.address}</Text>
                    <Text style={styles.addressHint}>Tap to open in maps</Text>
                  </TouchableOpacity>
                )}

                {venue.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>About this venue</Text>
                    <Text style={styles.description}>{venue.description}</Text>
                  </View>
                )}

                {/* Event Info */}
                {event && (
                  <View style={styles.eventSection}>
                    <Text style={styles.eventSectionTitle}>Event Details</Text>
                    
                    <View style={styles.eventCard}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      
                      <View style={styles.eventMeta}>
                        <Text style={styles.eventDate}>
                          📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                        
                        {event.time && (
                          <Text style={styles.eventTime}>
                            🕐 {event.time}
                          </Text>
                        )}
                      </View>

                      {event.description && (
                        <Text style={styles.eventDescription} numberOfLines={3}>
                          {event.description}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {event?.url && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={handleEventLink}
                    >
                      <Text style={styles.primaryButtonText}>🎫 View Event</Text>
                    </TouchableOpacity>
                  )}
                  
                  {venue.url && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={handleVenueWebsite}
                    >
                      <Text style={styles.secondaryButtonText}>🌐 Venue Website</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
    ...shadows.small,
  },
  closeButton: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  errorText: {
    ...typography.heading3,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.gray[100],
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.small,
  },
  typeBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  venueInfo: {
    padding: spacing.md,
  },
  venueName: {
    ...typography.heading1,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  addressContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  address: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  addressHint: {
    ...typography.caption,
    color: colors.primary[600],
    fontStyle: 'italic',
  },
  descriptionContainer: {
    marginBottom: spacing.lg,
  },
  descriptionLabel: {
    ...typography.heading4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  eventSection: {
    marginBottom: spacing.lg,
  },
  eventSectionTitle: {
    ...typography.heading3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary[500],
  },
  eventTitle: {
    ...typography.heading4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    marginBottom: spacing.sm,
  },
  eventDate: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventTime: {
    ...typography.bodySmall,
    color: colors.secondary[500],
    fontWeight: '600',
  },
  eventDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  primaryButton: {
    backgroundColor: colors.secondary[500],
  },
  secondaryButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
});

export default VenueModal;