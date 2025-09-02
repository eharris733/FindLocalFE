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
import { Text } from '../ui';
import { getVenuesByCity } from '../../api/venues';
import type { Venue } from '../../types/venues';

interface VenueSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedVenues: string[];
  onVenuesChange: (venueIds: string[]) => void;
  title?: string;
}

export default function VenueSelectionModal({
  visible,
  onClose,
  selectedVenues,
  onVenuesChange,
  title = 'Select Venues'
}: VenueSelectionModalProps) {
  const { theme } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch venues when modal opens
  useEffect(() => {
    if (visible) {
      fetchVenues();
    }
  }, [visible]);

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
      const venueData = await getVenuesByCity('brooklyn');
      setVenues(venueData);
      setFilteredVenues(venueData);
    } catch (err) {
      console.error('Error fetching venues:', err);
      setError('Failed to load venues');
      Alert.alert('Error', 'Failed to load venues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueToggle = (venueId: string) => {
    if (selectedVenues.includes(venueId)) {
      // Remove venue
      onVenuesChange(selectedVenues.filter(id => id !== venueId));
    } else {
      // Add venue
      onVenuesChange([...selectedVenues, venueId]);
    }
  };

  const handleSelectAll = () => {
    const allVenueIds = filteredVenues.map(venue => venue.id);
    const allSelected = allVenueIds.every(id => selectedVenues.includes(id));
    
    if (allSelected) {
      // If all are selected, deselect all
      onVenuesChange([]);
    } else {
      // If not all are selected, select all
      onVenuesChange(allVenueIds);
    }
  };

  const handleDeselectAll = () => {
    onVenuesChange([]);
  };

  // Check if all filtered venues are selected
  const allSelected = filteredVenues.length > 0 && 
    filteredVenues.every(venue => selectedVenues.includes(venue.id));

  const handleClose = () => {
    setSearchText('');
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

        {/* Action Buttons Row */}
        <View style={[styles.actionButtons, {
          backgroundColor: theme.colors.background.secondary,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderBottomColor: theme.colors.border.light,
        }]}>
          {/* Select All / Deselect All Toggle */}
          <TouchableOpacity
            style={[styles.actionButton, {
              backgroundColor: allSelected ? theme.colors.secondary[500] : theme.colors.primary[500],
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
            }]}
            onPress={handleSelectAll}
          >
            <Text variant="body2" style={{ 
              color: theme.colors.text.inverse, 
              fontWeight: '600' 
            }}>
              {allSelected ? 'Deselect All' : `Select All (${filteredVenues.length})`}
            </Text>
          </TouchableOpacity>
          
          {/* Future filter buttons can be added here */}
          <View style={styles.futureFilters}>
            {/* Placeholder for future filter buttons like type, size, money, etc. */}
          </View>

          <View style={styles.selectionCount}>
            <Text variant="caption" color="secondary">
              {selectedVenues.length} selected
            </Text>
          </View>
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
            const isSelected = selectedVenues.includes(venue.id);
            
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
                onPress={() => handleVenueToggle(venue.id)}
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
                    📍 {venue.city}
                    {venue.type && ` • ${venue.type}`}
                  </Text>
                </View>
                
                <View style={[styles.checkbox, {
                  backgroundColor: isSelected 
                    ? theme.colors.primary[500] 
                    : theme.colors.background.secondary,
                  borderColor: isSelected 
                    ? theme.colors.primary[500] 
                    : theme.colors.border.medium,
                }]}>
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: theme.colors.text.inverse }]}>
                      ✓
                    </Text>
                  )}
                </View>
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
  searchContainer: {
    paddingBottom: 0,
  },
  searchInput: {
    borderWidth: 1,
    height: 44,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureFilters: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCount: {
    flex: 1,
    alignItems: 'flex-end',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '600',
  },
});
