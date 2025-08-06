import React, { useState, useEffect } from 'react';
import {
  View,
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
import { getVenueByName, getVenueById, getVenuesByCity } from '../api/venues';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';

interface VenueModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const VenueModal: React.FC<VenueModalProps> = ({ visible, event, onClose }) => {
  const { theme } = useTheme();
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
    
    try {
      // For now, since events no longer have direct venue relationships,
      // we'll show venues in the same city as the event
      const venuesInCity = await getVenuesByCity(event.city);
      
      if (venuesInCity.length > 0) {
        // For now, just show the first venue in the city
        setVenue(venuesInCity[0]);
      } else {
        setError('No venues found in this city');
      }
    } catch (err) {
      console.error('Error fetching venues:', err);
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
    if (event?.detail_page_url) {
      Linking.openURL(event.detail_page_url);
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
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, {
          borderBottomColor: theme.colors.border.light,
          backgroundColor: theme.colors.background.primary,
          ...theme.shadows.small,
        }]}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: theme.colors.gray[100] }]} 
            onPress={onClose}
          >
            <Text variant="body1" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Venue Details
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text variant="body1" style={[styles.loadingText, { 
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.md,
              }]}>
                Loading venue information...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text variant="h3" style={[styles.errorText, { 
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.sm,
              }]}>
                😔 {error}
              </Text>
              <Text variant="body1" style={{ color: theme.colors.text.tertiary }}>
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
                    uri: venue.image || 'https://via.placeholder.com/400x200/63BAAB/FFFFFF?text=Venue'
                  }}
                  style={[styles.venueImage, { backgroundColor: theme.colors.gray[100] }]}
                  resizeMode="cover"
                />
                
                {/* Venue Type Badge */}
                <View style={[styles.typeBadge, {
                  backgroundColor: theme.colors.primary[500],
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.xs,
                  borderRadius: theme.borderRadius.full,
                  ...theme.shadows.small,
                }]}>
                  <Text variant="caption" style={{
                    color: theme.colors.text.inverse,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}>
                    {venue.type || 'Venue'}
                  </Text>
                </View>
              </View>

              {/* Venue Info */}
              <View style={[styles.venueInfo, { padding: theme.spacing.md }]}>
                <Text variant="h1" style={[styles.venueName, { 
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }]}>
                  {venue.name}
                </Text>
                
                {venue.address && (
                  <TouchableOpacity 
                    style={[styles.addressContainer, {
                      backgroundColor: theme.colors.background.secondary,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.lg,
                      marginBottom: theme.spacing.md,
                    }]}
                    onPress={handleAddressPress}
                  >
                    <Text variant="caption" style={{
                      color: theme.colors.text.tertiary,
                      textTransform: 'uppercase',
                      marginBottom: theme.spacing.xs,
                    }}>
                      📍 Address
                    </Text>
                    <Text variant="body1" style={{
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.xs,
                    }}>
                      {venue.address}
                    </Text>
                    <Text variant="caption" style={{
                      color: theme.colors.primary[600],
                      fontStyle: 'italic',
                    }}>
                      Tap to open in maps
                    </Text>
                  </TouchableOpacity>
                )}

                {venue.description && (
                  <View style={[styles.descriptionContainer, { marginBottom: theme.spacing.lg }]}>
                    <Text variant="h4" style={{
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.sm,
                    }}>
                      About this venue
                    </Text>
                    <Text variant="body1" style={{
                      color: theme.colors.text.secondary,
                      lineHeight: 24,
                    }}>
                      {venue.description}
                    </Text>
                  </View>
                )}

                {/* Event Info */}
                {event && (
                  <View style={[styles.eventSection, { marginBottom: theme.spacing.lg }]}>
                    <Text variant="h3" style={{
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.md,
                    }}>
                      Event Details
                    </Text>
                    
                    <View style={[styles.eventCard, {
                      backgroundColor: theme.colors.background.secondary,
                      padding: theme.spacing.md,
                      borderRadius: theme.borderRadius.lg,
                      borderLeftWidth: 4,
                      borderLeftColor: theme.colors.secondary[500],
                    }]}>
                      <Text variant="h4" style={{
                        color: theme.colors.text.primary,
                        marginBottom: theme.spacing.sm,
                      }}>
                        {event.title}
                      </Text>
                      
                      <View style={[styles.eventMeta, { marginBottom: theme.spacing.sm }]}>
                        {event.event_date && (
                          <Text variant="body2" style={{
                            color: theme.colors.primary[600],
                            fontWeight: '600',
                            marginBottom: theme.spacing.xs,
                          }}>
                            📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </Text>
                        )}
                        
                        {event.start_time && (
                          <Text variant="body2" style={{
                            color: theme.colors.secondary[500],
                            fontWeight: '600',
                          }}>
                            🕐 {event.start_time}
                          </Text>
                        )}
                      </View>

                      {event.description && (
                        <Text variant="body2" numberOfLines={3} style={{
                          color: theme.colors.text.secondary,
                          lineHeight: 20,
                        }}>
                          {event.description}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={[styles.actionButtons, { gap: theme.spacing.sm }]}>
                  {event?.detail_page_url && (
                    <TouchableOpacity
                      style={[styles.actionButton, {
                        backgroundColor: theme.colors.secondary[500],
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.lg,
                        borderRadius: theme.borderRadius.lg,
                        ...theme.shadows.small,
                      }]}
                      onPress={handleEventLink}
                    >
                      <Text variant="body1" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
                        🎫 View Event
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {venue.url && (
                    <TouchableOpacity
                      style={[styles.actionButton, {
                        backgroundColor: theme.colors.background.secondary,
                        borderWidth: 1,
                        borderColor: theme.colors.border.medium,
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.lg,
                        borderRadius: theme.borderRadius.lg,
                        ...theme.shadows.small,
                      }]}
                      onPress={handleVenueWebsite}
                    >
                      <Text variant="body1" style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
                        🌐 Venue Website
                      </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    borderRadius: 9999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
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
    paddingVertical: 64,
  },
  loadingText: {},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorText: {
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
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  venueInfo: {},
  venueName: {},
  addressContainer: {},
  descriptionContainer: {},
  eventSection: {},
  eventCard: {},
  eventMeta: {},
  actionButtons: {},
  actionButton: {
    alignItems: 'center',
  },
});

export default VenueModal;