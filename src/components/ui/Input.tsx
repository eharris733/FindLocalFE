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

// Constants for eye icon dimensions and spacing
const EYE_ICON_SIZE = 24;
const EYE_ICON_RIGHT_POSITION = 12;
const EYE_ICON_HORIZONTAL_PADDING = 4;
const INPUT_PADDING_BUFFER = 8; // Extra buffer space between text and icon

// Calculate total padding needed when eye icon is visible
const PASSWORD_TOGGLE_PADDING = 
  EYE_ICON_SIZE + 
  EYE_ICON_RIGHT_POSITION + 
  EYE_ICON_HORIZONTAL_PADDING + 
  INPUT_PADDING_BUFFER;

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
              paddingRight: showPasswordToggle ? PASSWORD_TOGGLE_PADDING : 16,
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
              size={EYE_ICON_SIZE} 
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
    right: EYE_ICON_RIGHT_POSITION,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: EYE_ICON_HORIZONTAL_PADDING,
  },
  error: {
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
