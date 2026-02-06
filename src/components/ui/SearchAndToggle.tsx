import React, { useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface SearchAndToggleProps {
  searchText: string;
  onSearchChange: (text: string) => void;
}

export const SearchAndToggle: React.FC<SearchAndToggleProps> = ({
  searchText,
  onSearchChange,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const isNativeMobile = Platform.OS !== 'web';

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.blur();
    if (isNativeMobile) {
      Keyboard.dismiss();
    }
  };

  const handleSubmitEditing = () => {
    if (isNativeMobile) {
      Keyboard.dismiss();
    }
  };

  return (
      <View style={[
        styles.searchContainer,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.light,
        }
      ]}>
        <Text variant="body2" color="secondary" style={styles.searchIcon}>
          🔍
        </Text>
        <TextInput
          ref={inputRef}
          style={[
            styles.searchInput,
            {
              color: theme.colors.text.primary,
            }
          ]}
          placeholder="Search events, venues, artists..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchText}
          onChangeText={onSearchChange}
          returnKeyType={isNativeMobile ? 'search' : undefined}
          onSubmitEditing={isNativeMobile ? handleSubmitEditing : undefined}
        />
        {isNativeMobile && searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
