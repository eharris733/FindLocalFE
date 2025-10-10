import React from 'react';
import { TextInput, StyleSheet, View, TextInputProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text variant="label" style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            borderColor: error ? theme.colors.error : theme.colors.border.medium,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.text.secondary}
        {...rest}
      />
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
