import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
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

  return (
    <View style={styles.container}>
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
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
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
});
