import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';

interface SignupValueCardProps {
  onSkip?: () => void;
}

const valueProps = [
  { icon: '🎟️', text: 'RSVP to events and track your plans' },
  { icon: '❤️', text: 'Save favorites and get personalized recommendations' },
  { icon: '💌', text: 'Receive invites from friends' },
  { icon: '🔔', text: 'Get notifications for events you care about' },
];

export const SignupValueCard: React.FC<SignupValueCardProps> = ({ onSkip }) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignup = (method: 'email' | 'google' | 'apple') => {
    router.push(`/user/signup?method=${method}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.card, {
        backgroundColor: theme.colors.background.secondary,
        ...theme.shadows.small,
      }]}>
        <Text variant="h3" style={[styles.title, { color: theme.colors.text.primary }]}>
          Create your account
        </Text>

        <View style={styles.valueProps}>
          {valueProps.map((prop, index) => (
            <View key={index} style={styles.valueProp}>
              <Text style={styles.valueIcon}>{prop.icon}</Text>
              <Text variant="body2" style={{ color: theme.colors.text.secondary, flex: 1 }}>
                {prop.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: '#000' }]}
              onPress={() => handleSignup('apple')}
            >
              <Text style={styles.appleIcon}></Text>
              <Text variant="label" style={{ color: '#fff' }}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: '#4285F4' }]}
            onPress={() => handleSignup('google')}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text variant="label" style={{ color: '#fff' }}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authButton, {
              backgroundColor: theme.colors.primary[600],
            }]}
            onPress={() => handleSignup('email')}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>✉️</Text>
            <Text variant="label" style={{ color: '#fff' }}>
              Continue with Email
            </Text>
          </TouchableOpacity>
        </View>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text variant="body2" style={{ color: theme.colors.text.secondary }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  valueProps: {
    marginBottom: 24,
    gap: 12,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  valueIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  buttons: {
    gap: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
  },
  appleIcon: {
    fontSize: 18,
    color: '#fff',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
});
