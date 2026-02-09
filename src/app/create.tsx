import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useCityLocation } from '../context/CityContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import VenueSelectionModal from '../components/ui/VenueSelectionModal';
import type { VenueSelection } from '../components/ui/VenueSelectionModal';

export default function CreateRoute() {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const { isDesktop } = useDeviceInfo();
  const insets = useSafeAreaInsets();

  // Form state
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 4 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState('');
  const [description, setDescription] = useState('');
  const [showVenueModal, setShowVenueModal] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add a cover photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setStartDate(selectedDate);

      if (Platform.OS === 'android' && pickerMode === 'date') {
        setPickerMode('time');
        setTimeout(() => setShowStartPicker(true), 100);
      } else if (Platform.OS === 'android' && pickerMode === 'time') {
        setPickerMode('date');
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setEndDate(selectedDate);

      if (Platform.OS === 'android' && pickerMode === 'date') {
        setPickerMode('time');
        setTimeout(() => setShowEndPicker(true), 100);
      } else if (Platform.OS === 'android' && pickerMode === 'time') {
        setPickerMode('date');
      }
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleVenueSelect = (selection: VenueSelection) => {
    if (selection.type === 'venue') {
      setVenueId(selection.venueId);
      setVenueName(selection.venueName);
      setCustomLocation('');
    } else {
      setVenueId(null);
      setVenueName(null);
      setCustomLocation(selection.address);
    }
  };

  const locationDisplayText = venueName || customLocation || null;

  const handlePublish = () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Information', 'Please enter an event name.');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Invalid Times', 'End time must be after start time.');
      return;
    }

    // TODO: Implement event creation API call
    Alert.alert('Success', 'Event created successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleCancel = () => {
    if (eventName || description || coverImage) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard this event?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background.primary,
        borderBottomColor: theme.colors.border.light,
      }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Text variant="body1" style={{ color: theme.colors.text.primary }}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text variant="h3" style={{ color: theme.colors.text.primary }}>
          Create Event
        </Text>

        <TouchableOpacity
          onPress={handlePublish}
          style={[styles.publishButton, { backgroundColor: theme.colors.secondary[500] }]}
        >
          <Text variant="body2" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
            Publish
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[
          styles.formWrapper,
          isDesktop && { maxWidth: 600, alignSelf: 'center' as const, width: '100%' as any },
        ]}>
          {/* Cover Photo Section */}
          <TouchableOpacity
            style={[styles.coverPhotoSection, {
              backgroundColor: theme.colors.background.secondary,
              borderBottomColor: theme.colors.border.light,
            }, isDesktop && styles.coverPhotoDesktop]}
            onPress={pickImage}
          >
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <Text style={{ fontSize: 40 }}>
                  📷
                </Text>
                <Text
                  variant="body1"
                  style={{ color: theme.colors.text.secondary, marginTop: 8 }}
                >
                  Add Cover Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Event Details Section */}
          <View style={styles.formSection}>
            {/* Event Name */}
            <TextInput
              style={[
                styles.eventNameInput,
                {
                  backgroundColor: 'transparent',
                  color: theme.colors.text.tertiary,
                  borderBottomColor: theme.colors.border.light,
                },
              ]}
              placeholder="Event Name"
              placeholderTextColor={theme.colors.text.tertiary}
              value={eventName}
              onChangeText={setEventName}
            />

            {/* Details Card */}
            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.primary[500],
                },
              ]}
            >
              {/* Start Date/Time */}
              <View style={styles.detailRow}>
                <View style={styles.iconContainer}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text variant="caption" style={{ color: theme.colors.secondary[500], marginBottom: 4 }}>
                    START
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPickerMode('date');
                      setShowStartPicker(true);
                    }}
                  >
                    <Text variant="body1" style={{ color: theme.colors.text.primary }}>
                      {formatDateTime(startDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </View>

              {/* End Date/Time */}
              <View style={[styles.detailRow, { borderTopWidth: 0 }]}>
                <View style={styles.iconContainer}>
                  <View style={{ width: 20 }} />
                </View>
                <View style={styles.detailContent}>
                  <Text variant="caption" style={{ color: theme.colors.text.tertiary, marginBottom: 4 }}>
                    END
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPickerMode('date');
                      setShowEndPicker(true);
                    }}
                  >
                    <Text variant="body1" style={{ color: theme.colors.text.primary }}>
                      {formatDateTime(endDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </View>

              {/* Location/Venue */}
              <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: theme.colors.border.light }]}>
                <View style={styles.iconContainer}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
                <TouchableOpacity
                  style={styles.detailContent}
                  onPress={() => setShowVenueModal(true)}
                >
                  <Text
                    variant="body1"
                    style={{ color: locationDisplayText ? theme.colors.text.primary : theme.colors.text.tertiary }}
                  >
                    {locationDisplayText || 'Add Location or Venue'}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18 }}>🗺️</Text>
              </View>
            </View>

            {/* Description */}
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.light,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Add a description... What should guests expect?"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            {/* Privacy Disclaimer */}
            <View style={styles.section}>
              <Text
                variant="body2"
                style={{
                  color: theme.colors.text.tertiary,
                  marginBottom: 12,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                🔒 PRIVACY
              </Text>

              <Text
                variant="body2"
                style={{ color: theme.colors.text.tertiary, lineHeight: 20 }}
              >
                All FindLocal events are private by default. More visibility options will be available soon. For now, invitees must have an invite link.
              </Text>
            </View>

            {/* Tipping — Coming Soon */}
            <View style={styles.section}>
              <Text
                variant="body2"
                style={{
                  color: theme.colors.text.tertiary,
                  marginBottom: 12,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                }}
              >
                💰 TIPPING
              </Text>

              <View
                style={[
                  styles.tippingCard,
                  { backgroundColor: theme.colors.background.secondary },
                ]}
              >
                <Text
                  variant="body2"
                  style={{ color: theme.colors.text.secondary, lineHeight: 20, marginBottom: 12 }}
                >
                  Tipping is coming soon! You'll be able to accept tips from your guests.
                </Text>
                <View
                  style={[
                    styles.comingSoonPill,
                    { backgroundColor: theme.colors.secondary[500] },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.text.inverse, fontWeight: '600' }}
                  >
                    Coming Soon
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom spacing for tab bar / safe area */}
          <View style={{ height: Math.max(insets.bottom, 20) + 100 }} />
        </View>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          themeVariant={theme.colors.background.primary === '#FFFFFF' ? 'light' : 'dark'}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          themeVariant={theme.colors.background.primary === '#FFFFFF' ? 'light' : 'dark'}
        />
      )}

      {/* Venue Selection Modal */}
      <VenueSelectionModal
        visible={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        onSelect={handleVenueSelect}
        selectedVenueId={venueId}
        city={selectedCity}
        title="Select Venue"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  formWrapper: {
    flex: 1,
  },
  coverPhotoSection: {
    height: 240,
    borderBottomWidth: 1,
  },
  coverPhotoDesktop: {
    borderRadius: 12,
    margin: 16,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    padding: 16,
  },
  eventNameInput: {
    fontSize: 24,
    fontWeight: '300',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  detailsCard: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 24,
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  tippingCard: {
    borderRadius: 8,
    padding: 16,
  },
  comingSoonPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
