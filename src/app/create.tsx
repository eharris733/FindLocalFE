import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useCityLocation } from '../context/CityContext';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useAuth } from '../hooks/useAuth';
import { createEvent, updateEvent, getEventById } from '../api/events';
import { uploadEventImage } from '../api/storage';
import { logger } from '../utils/logger';
import VenueSelectionModal from '../components/ui/VenueSelectionModal';
import type { VenueSelection } from '../components/ui/VenueSelectionModal';

export default function CreateRoute() {
  const { theme } = useTheme();
  const { selectedCity } = useCityLocation();
  const { isDesktop } = useDeviceInfo();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, session } = useAuth();
  const queryClient = useQueryClient();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditMode = !!editId;

  // Form state
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [originalEventName, setOriginalEventName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  // Load event data in edit mode
  useEffect(() => {
    if (!editId) return;
    const loadEvent = async () => {
      setIsLoadingEdit(true);
      try {
        const eventData = await getEventById(editId);
        if (!eventData) {
          Alert.alert('Error', 'Event not found.');
          router.back();
          return;
        }
        if (eventData.creator_id !== session?.user?.id) {
          Alert.alert('Error', 'You do not have permission to edit this event.');
          router.back();
          return;
        }
        setEventName(eventData.title || '');
        setOriginalEventName(eventData.title || '');
        setDescription(eventData.description || '');
        setOriginalDescription(eventData.description || '');
        if (eventData.event_date) {
          const date = new Date(eventData.event_date);
          if (eventData.start_time) {
            const [h, m] = eventData.start_time.split(':').map(Number);
            date.setHours(h, m, 0, 0);
          }
          setStartDate(date);
        }
        if (eventData.event_date) {
          const end = new Date(eventData.event_date);
          if (eventData.end_time) {
            const [h, m] = eventData.end_time.split(':').map(Number);
            end.setHours(h, m, 0, 0);
          } else {
            end.setHours(startDate.getHours() + 4, startDate.getMinutes(), 0, 0);
          }
          setEndDate(end);
        }
        if (eventData.venue_id) {
          setVenueId(eventData.venue_id);
        }
        if (eventData.custom_location) {
          setCustomLocation(eventData.custom_location);
        }
        if (eventData.cover_image_url) {
          setCoverImage(eventData.cover_image_url);
          setOriginalImageUrl(eventData.cover_image_url);
        } else if (eventData.image_url) {
          setCoverImage(eventData.image_url);
          setOriginalImageUrl(eventData.image_url);
        }
      } catch (err) {
        logger.error('Error loading event for edit:', err);
        Alert.alert('Error', 'Failed to load event data.');
        router.back();
      } finally {
        setIsLoadingEdit(false);
      }
    };
    loadEvent();
  }, [editId]);

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

  const handlePublish = async () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Information', 'Please enter an event name.');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Invalid Times', 'End time must be after start time.');
      return;
    }

    if (!isLoggedIn || !session?.user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to create an event.');
      return;
    }

    setIsPublishing(true);

    try {
      const eventDate = startDate.toISOString().split('T')[0];
      const startTimeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      const endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      if (isEditMode && editId) {
        // ── Edit flow ──
        const imageChanged = coverImage !== originalImageUrl;
        let newImageUrl = originalImageUrl;

        if (imageChanged && coverImage && !coverImage.startsWith('http')) {
          const { publicUrl, error: uploadErr } = await uploadEventImage(
            coverImage,
            session.user.id,
            editId
          );
          if (uploadErr) {
            Alert.alert('Image Upload Failed', uploadErr);
            setIsPublishing(false);
            return;
          }
          newImageUrl = publicUrl;
        }

        const { error: updateErr } = await updateEvent({
          id: editId,
          title: eventName,
          description: description || null,
          event_date: eventDate,
          start_time: startTimeStr,
          end_time: endTimeStr,
          venue_id: venueId,
          custom_location: customLocation || null,
          city: selectedCity || 'Boston',
          ...(imageChanged ? { cover_image_url: newImageUrl } : {}),
        });

        if (updateErr) {
          Alert.alert('Error', updateErr);
          setIsPublishing(false);
          return;
        }

        queryClient.invalidateQueries({ queryKey: ['myCreatedEvents'] });
        queryClient.invalidateQueries({ queryKey: ['myInvitationsWithStats'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        router.replace(`/event/${editId}`);
      } else {
        // ── Create flow ──
        const { data, error: createErr } = await createEvent({
          title: eventName,
          description: description || null,
          event_date: eventDate,
          start_time: startTimeStr,
          end_time: endTimeStr,
          venue_id: venueId,
          custom_location: customLocation || null,
          city: selectedCity || 'Boston',
          is_private: true,
        });

        if (createErr || !data) {
          Alert.alert('Error', createErr || 'Failed to create event.');
          setIsPublishing(false);
          return;
        }

        const eventId = data.id;

        // Upload cover image if present
        if (coverImage) {
          const { publicUrl, error: uploadErr } = await uploadEventImage(
            coverImage,
            session.user.id,
            eventId
          );
          if (!uploadErr && publicUrl) {
            await updateEvent({ id: eventId, cover_image_url: publicUrl });
          } else {
            logger.warn('Cover image upload failed, continuing without image:', uploadErr);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['myCreatedEvents'] });
        queryClient.invalidateQueries({ queryKey: ['myInvitationsWithStats'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        router.replace(`/event/${eventId}?justCreated=true`);
      }
    } catch (err: any) {
      logger.error('Error publishing event:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      // In edit mode, only show discard modal if something actually changed
      const hasChanges =
        eventName !== originalEventName ||
        description !== originalDescription ||
        coverImage !== originalImageUrl;
      if (hasChanges) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => router.back() }
          ]
        );
      } else {
        router.back();
      }
    } else {
      // In create mode, show modal if any field has content
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
          {isEditMode ? 'Edit Event' : 'Create Event'}
        </Text>

        <TouchableOpacity
          onPress={handlePublish}
          disabled={isPublishing}
          style={[styles.publishButton, {
            backgroundColor: isPublishing ? theme.colors.gray[400] : theme.colors.secondary[500],
          }]}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={theme.colors.text.inverse} />
          ) : (
            <Text variant="body2" style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>
              {isEditMode ? 'Save' : 'Publish'}
            </Text>
          )}
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
