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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import VenueSelectionModal from '../components/ui/VenueSelectionModal';

type PrivacyOption = 'public' | 'friends' | 'private';

export default function CreateRoute() {
  const { theme } = useTheme();

  // Form state
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 4 * 60 * 60 * 1000)); // 4 hours later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyOption>('public');
  const [requirePayment, setRequirePayment] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('15.00');
  const [capacity, setCapacity] = useState('100');
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

      // If changing date on Android, show time picker next
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

      // If changing date on Android, show time picker next
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

  const handlePublish = () => {
    // Validate form
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
        {/* Cover Photo Section */}
        <TouchableOpacity
          style={[styles.coverPhotoSection, {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.light,
          }]}
          onPress={pickImage}
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPhotoPlaceholder}>
              <Ionicons
                name="camera-outline"
                size={48}
                color={theme.colors.secondary[500]}
              />
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
                <Ionicons name="calendar-outline" size={20} color={theme.colors.text.secondary} />
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
              <Ionicons name="calendar" size={20} color={theme.colors.text.tertiary} />
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
              <Ionicons name="calendar" size={20} color={theme.colors.text.tertiary} />
            </View>

            {/* Location/Venue */}
            <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: theme.colors.border.light }]}>
              <View style={styles.iconContainer}>
                <Ionicons name="location-outline" size={20} color={theme.colors.text.secondary} />
              </View>
              <TouchableOpacity
                style={styles.detailContent}
                onPress={() => setShowVenueModal(true)}
              >
                <Text
                  variant="body1"
                  style={{ color: venueId ? theme.colors.text.primary : theme.colors.text.tertiary }}
                >
                  {venueId ? 'Venue Selected' : 'Add Location or Venue'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="map-outline" size={20} color={theme.colors.text.tertiary} />
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

          {/* Privacy Section */}
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
              PRIVACY
            </Text>

            <View style={styles.privacyOptions}>
              {(['public', 'friends', 'private'] as PrivacyOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.privacyOption,
                    {
                      backgroundColor:
                        privacy === option
                          ? theme.colors.primary[500]
                          : theme.colors.background.secondary,
                    },
                  ]}
                  onPress={() => setPrivacy(option)}
                >
                  <Ionicons
                    name={
                      option === 'public'
                        ? 'earth'
                        : option === 'friends'
                        ? 'people'
                        : 'lock-closed'
                    }
                    size={20}
                    color={
                      privacy === option
                        ? theme.colors.text.inverse
                        : theme.colors.text.secondary
                    }
                  />
                  <Text
                    variant="body2"
                    style={{
                      color:
                        privacy === option
                          ? theme.colors.text.inverse
                          : theme.colors.text.primary,
                      marginTop: 4,
                      textTransform: 'capitalize',
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {privacy === 'public' && (
              <Text
                variant="caption"
                style={{ color: theme.colors.text.tertiary, marginTop: 8 }}
              >
                Public events are visible to everyone on FindLocal.
              </Text>
            )}
          </View>

          {/* Ticketing Section */}
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
              TICKETING
            </Text>

            <View
              style={[
                styles.ticketingCard,
                { backgroundColor: theme.colors.background.secondary },
              ]}
            >
              <View style={styles.ticketingToggle}>
                <View style={styles.ticketingLabel}>
                  <Ionicons
                    name="ticket-outline"
                    size={24}
                    color={theme.colors.secondary[500]}
                  />
                  <Text
                    variant="body1"
                    style={{ color: theme.colors.text.primary, marginLeft: 12 }}
                  >
                    Require Payment
                  </Text>
                </View>
                <Switch
                  value={requirePayment}
                  onValueChange={setRequirePayment}
                  trackColor={{
                    false: theme.colors.gray[300],
                    true: theme.colors.secondary[500],
                  }}
                  thumbColor={theme.colors.text.inverse}
                />
              </View>

              {requirePayment && (
                <View style={styles.ticketingDetails}>
                  <View style={styles.ticketingRow}>
                    <View style={styles.ticketingField}>
                      <Text
                        variant="caption"
                        style={{
                          color: theme.colors.text.tertiary,
                          marginBottom: 4,
                          fontWeight: '600',
                          letterSpacing: 0.5,
                        }}
                      >
                        TICKET PRICE
                      </Text>
                      <View style={styles.priceInputContainer}>
                        <Text
                          variant="h2"
                          style={{ color: theme.colors.text.primary }}
                        >
                          $
                        </Text>
                        <TextInput
                          style={[
                            styles.priceInput,
                            { color: theme.colors.text.primary },
                          ]}
                          value={ticketPrice}
                          onChangeText={setTicketPrice}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={theme.colors.text.tertiary}
                        />
                      </View>
                    </View>

                    <View style={styles.ticketingField}>
                      <Text
                        variant="caption"
                        style={{
                          color: theme.colors.text.tertiary,
                          marginBottom: 4,
                          fontWeight: '600',
                          letterSpacing: 0.5,
                        }}
                      >
                        CAPACITY
                      </Text>
                      <TextInput
                        style={[
                          styles.capacityInput,
                          { color: theme.colors.text.primary },
                        ]}
                        value={capacity}
                        onChangeText={setCapacity}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 120 }} />
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
        selectedVenues={venueId ? [venueId] : []}
        onVenuesChange={(venues) => {
          setVenueId(venues[0] || null);
          setShowVenueModal(false);
        }}
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
  coverPhotoSection: {
    height: 240,
    borderBottomWidth: 1,
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
  privacyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  ticketingCard: {
    borderRadius: 8,
    padding: 16,
  },
  ticketingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketingDetails: {
    marginTop: 16,
    paddingTop: 16,
  },
  ticketingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ticketingField: {
    flex: 1,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    fontSize: 32,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  capacityInput: {
    fontSize: 32,
    fontWeight: '600',
  },
});
