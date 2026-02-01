import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../ui';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';

export const SignupCtaBanner: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary[50] }]}>
      <View style={styles.content}>
        <Text variant="h4" style={[styles.title, { color: theme.colors.primary[700] }]}>
          Get more out of FindLocal
        </Text>
        <Text variant="body2" style={[styles.subtitle, { color: theme.colors.primary[600] }]}>
          Sign up to RSVP, save favorites, and get invites from friends
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary[600] }]}
        onPress={() => router.push('/user/signup')}
      >
        <Text variant="label" style={{ color: theme.colors.text.inverse }}>
          Create Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 20,
    borderRadius: 12,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
});
