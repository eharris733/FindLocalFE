import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Text, Button } from './ui';
import { useAuth } from '../hooks/useAuth';
import { FeedbackType, submitFeedback } from '../api/feedback';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { logger } from '../utils/logger';

interface FeedbackModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { theme } = useTheme();
  const { isLoggedIn, profile } = useAuth();

  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { id: 'bug' as FeedbackType, label: 'Report a Bug', icon: '🔧', description: 'Something isn\'t working' },
    { id: 'feature' as FeedbackType, label: 'Feature Request', icon: '💡', description: 'Suggest an improvement' },
    { id: 'general' as FeedbackType, label: 'General Feedback', icon: '💬', description: 'Share your thoughts' },
  ];

  const handleSubmit = async () => {
    if (!selectedType || !feedbackText.trim()) {
      showErrorToast('Please select a feedback type and enter your feedback');
      return;
    }

    // Require login to submit feedback
    if (!isLoggedIn) {
      showErrorToast('Please sign in to submit feedback');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get email from profile if not anonymous
      const email = (!isAnonymous && profile?.email) ? profile.email : null;

      const result = await submitFeedback({
        email,
        feedbackType: selectedType,
        feedbackText: feedbackText.trim(),
        isAnonymous,
      });

      if (result.success) {
        showSuccessToast('Thank you for your feedback!');
        handleClose();
      } else {
        showErrorToast('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      logger.error('Error submitting feedback:', err);
      showErrorToast('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedType(null);
    setFeedbackText('');
    setIsAnonymous(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
          <Text variant="h2" style={styles.title}>
            Share Your Feedback
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text variant="h3" color="secondary">×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <Text variant="body1" color="secondary" style={styles.description}>
            Your input helps us build a better experience for finding local events. Tell us what's working, what's not, or what you'd like to see!
          </Text>

          {/* Feedback Type Selection */}
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              What type of feedback?
            </Text>
            <View style={styles.typeButtons}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: selectedType === type.id ? theme.colors.primary[500] : theme.colors.border.light,
                      borderWidth: selectedType === type.id ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text variant="body1" style={styles.typeLabel}>
                    {type.label}
                  </Text>
                  <Text variant="caption" color="secondary" style={styles.typeDescription}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feedback Text */}
          <View style={styles.section}>
            <Text variant="h4" style={styles.sectionTitle}>
              Your feedback
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.light,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Tell us what you think..."
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
          </View>

          {/* Anonymous Option */}
          {isLoggedIn && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsAnonymous(!isAnonymous)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: theme.colors.border.light },
                    isAnonymous && [styles.checkboxChecked, { backgroundColor: theme.colors.primary[500] }],
                  ]}
                >
                  {isAnonymous && (
                    <View style={[styles.checkboxInner, { backgroundColor: theme.colors.background.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body2" style={styles.checkboxLabel}>
                    Submit feedback anonymously
                  </Text>
                  <Text variant="caption" color="secondary" style={styles.checkboxDescription}>
                    Your email will not be recorded
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border.light }]}>
          <Button
            variant="primary"
            title={isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            onPress={handleSubmit}
            disabled={isSubmitting || !selectedType || !feedbackText.trim()}
            style={styles.submitButton}
          />
          {isSubmitting && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary[500]}
              style={styles.loadingIndicator}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  typeButtons: {
    gap: 12,
  },
  typeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDescription: {
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontWeight: '500',
  },
  checkboxDescription: {
    marginTop: 2,
  },
  guestNotice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    width: '100%',
  },
  loadingIndicator: {
    marginTop: 8,
  },
});
