import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { getVenuesByCity, getAllVenues } from '../../api/venues';
import { getDisplayCityName } from '../../utils/cityUtils';
import type { Venue } from '../../types/venues';
import { logger } from '../../utils/logger';

export type VenueSelection =
  | { type: 'venue'; venueId: string; venueName: string }
  | { type: 'custom'; address: string };

interface VenueSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: VenueSelection) => void;
  selectedVenueId?: string | null;
  city?: string;
  title?: string;
}

export default function VenueSelectionModal({
  visible,
  onClose,
  onSelect,
  selectedVenueId,
  city,
  title = 'Select Venue',
}: VenueSelectionModalProps) {
  const { theme } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customAddress, setCustomAddress] = useState('');

  // Fetch venues when modal opens
  useEffect(() => {
    if (visible) {
      fetchVenues();
    }
  }, [visible, city]);

  // Filter venues based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredVenues(venues);
    } else {
      const filtered = venues.filter(venue =>
        venue.name.toLowerCase().includes(searchText.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredVenues(filtered);
    }
  }, [searchText, venues]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      const venueData = city
        ? await getVenuesByCity(city)
        : await getAllVenues();
      setVenues(venueData);
      setFilteredVenues(venueData);
    } catch (err) {
      logger.error('Error fetching venues:', err);
      setError('Failed to load venues');
      Alert.alert('Error', 'Failed to load venues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSelect = (venue: Venue) => {
    onSelect({ type: 'venue', venueId: venue.id, venueName: venue.name });
    handleClose();
  };

  const handleCustomAddressSubmit = () => {
    if (!customAddress.trim()) return;
    onSelect({ type: 'custom', address: customAddress.trim() });
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setCustomAddress('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
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
            onPress={handleClose}
          >
            <Text variant="body1" style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>
              ✕
            </Text>
          </TouchableOpacity>

          <Text variant="h3" style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Custom Address Section */}
        <View style={[styles.customAddressSection, {
          backgroundColor: theme.colors.background.secondary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          <Text variant="caption" style={{
            color: theme.colors.text.tertiary,
            fontWeight: '600',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
            USE CUSTOM ADDRESS
          </Text>
          <View style={styles.customAddressRow}>
            <TextInput
              style={[styles.customAddressInput, {
                backgroundColor: theme.colors.background.primary,
                borderColor: theme.colors.border.light,
                color: theme.colors.text.primary,
                borderRadius: theme.borderRadius.md,
              }]}
              placeholder="e.g. 123 Main St, house show, park..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={customAddress}
              onChangeText={setCustomAddress}
            />
            <TouchableOpacity
              style={[styles.useAddressButton, {
                backgroundColor: customAddress.trim()
                  ? theme.colors.secondary[500]
                  : theme.colors.gray[300],
                borderRadius: theme.borderRadius.md,
              }]}
              onPress={handleCustomAddressSubmit}
              disabled={!customAddress.trim()}
            >
              <Text variant="body2" style={{
                color: theme.colors.text.inverse,
                fontWeight: '600',
              }}>
                Use
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider label */}
        <View style={[styles.orDivider, {
          backgroundColor: theme.colors.background.secondary,
          borderBottomColor: theme.colors.border.light,
        }]}>
          <Text variant="caption" style={{
            color: theme.colors.text.tertiary,
            fontWeight: '600',
            letterSpacing: 0.5,
          }}>
            OR SELECT A VENUE
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, {
          backgroundColor: theme.colors.background.secondary,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }]}>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.light,
              color: theme.colors.text.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
            }]}
            placeholder="Search venues..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Venue List */}
        <ScrollView style={styles.venueList} showsVerticalScrollIndicator={true}>
          {loading && (
            <View style={styles.loadingContainer}>
              <Text variant="body1" color="secondary">
                Loading venues...
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text variant="body1" color="secondary">
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, {
                  backgroundColor: theme.colors.primary[500],
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  marginTop: theme.spacing.sm,
                }]}
                onPress={fetchVenues}
              >
                <Text variant="body2" style={{
                  color: theme.colors.text.inverse,
                  fontWeight: '600'
                }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && filteredVenues.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text variant="body1" color="secondary">
                No venues found
              </Text>
            </View>
          )}

          {!loading && !error && filteredVenues.map((venue) => {
            const isSelected = selectedVenueId === venue.id;

            return (
              <TouchableOpacity
                key={venue.id}
                style={[styles.venueItem, {
                  backgroundColor: isSelected
                    ? theme.colors.primary[50]
                    : theme.colors.background.primary,
                  borderColor: isSelected
                    ? theme.colors.primary[200]
                    : theme.colors.border.light,
                  borderLeftColor: isSelected
                    ? theme.colors.primary[500]
                    : 'transparent',
                }]}
                onPress={() => handleVenueSelect(venue)}
              >
                <View style={styles.venueInfo}>
                  <Text
                    variant="body1"
                    style={[styles.venueName, {
                      color: isSelected
                        ? theme.colors.primary[700]
                        : theme.colors.text.primary,
                      fontWeight: isSelected ? '600' : '500',
                    }]}
                  >
                    {venue.name}
                  </Text>
                  <Text variant="caption" color="secondary" style={styles.venueLocation}>
                    📍 {getDisplayCityName(venue.city)}
                    {venue.type && ` • ${venue.type}`}
                  </Text>
                </View>

                {isSelected && (
                  <View style={[styles.selectedIndicator, {
                    backgroundColor: theme.colors.primary[500],
                  }]}>
                    <Text style={{ color: theme.colors.text.inverse, fontSize: 14, fontWeight: '600' }}>
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

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
  customAddressSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  customAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customAddressInput: {
    flex: 1,
    borderWidth: 1,
    height: 44,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  useAddressButton: {
    height: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orDivider: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchContainer: {
    paddingBottom: 0,
  },
  searchInput: {
    borderWidth: 1,
    height: 44,
    fontSize: 16,
  },
  venueList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    marginBottom: 4,
  },
  venueLocation: {
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
