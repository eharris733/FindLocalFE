import React, { useState } from 'react';
import { TextInput, StyleSheet, View, TextInputProps, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export function Input({ label, error, style, showPasswordToggle = false, secureTextEntry, ...rest }: InputProps) {
  const { theme } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const shouldSecureText = showPasswordToggle ? !isPasswordVisible : secureTextEntry;

  // Web-specific props to prevent autofill styling
  const webProps = Platform.OS === 'web' ? {
    dataSet: { 'no-autofill': 'true' },
  } : {};

  return (
    <View style={styles.container}>
      {label && (
        <Text 
          variant="label" 
          color="primary"
          style={[styles.label, { color: theme.colors.text.primary }]}
        >
          {label}
        </Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: error ? theme.colors.error : theme.colors.border.medium,
              paddingRight: showPasswordToggle ? 48 : 16,
            },
            style,
          ] as any}
          placeholderTextColor={theme.colors.text.tertiary}
          secureTextEntry={shouldSecureText}
          {...webProps}
          {...rest}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={togglePasswordVisibility}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color={theme.colors.primary[500]} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text variant="caption" color="error" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  label: {
    marginBottom: 4,
    marginLeft: 2,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  error: {
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
