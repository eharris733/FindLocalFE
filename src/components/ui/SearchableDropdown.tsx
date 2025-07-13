import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { Portal } from './Portal';

interface SearchableDropdownProps {
  data: string[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  maxHeight?: number;
  disabled?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  data,
  value,
  onSelect,
  placeholder = 'Search...',
  label,
  maxHeight = 200,
  disabled = false,
  minWidth = 180,
  maxWidth = 300,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (searchText === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        item.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchText, data]);

  const measureContainer = () => {
    if (containerRef.current) {
      containerRef.current.measureInWindow((x, y, width, height) => {
        setDropdownLayout({ x, y: y + height, width, height });
      });
    }
  };

  const handleSelect = (item: string) => {
    onSelect(item);
    setIsOpen(false);
    setSearchText('');
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (!disabled) {
      measureContainer();
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
  };

  const displayValue = value === 'all' ? 'All Venues' : value;
  const { width: screenWidth } = Dimensions.get('window');

  return (
    <>
      <View 
        ref={containerRef}
        style={[styles.container, { minWidth, maxWidth }]}
      >
        {label && (
          <Text variant="caption" color="secondary" style={styles.label}>
            {label.toUpperCase()}
          </Text>
        )}
        
        <TouchableOpacity
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background.secondary,
              borderColor: isOpen ? theme.colors.primary[500] : theme.colors.border.light,
              borderRadius: theme.borderRadius.md,
              height: 44, // Match search input height
            },
            disabled && { opacity: 0.5 }
          ]}
          onPress={handleFocus}
          disabled={disabled}
        >
          <Text 
            variant="body2" 
            color={value === 'all' ? 'tertiary' : 'primary'}
            numberOfLines={1}
            style={styles.inputText}
          >
            {displayValue}
          </Text>
          <Text variant="body2" color="tertiary" style={styles.arrow}>
            {isOpen ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <Portal>
          <View
            style={[
              styles.dropdown,
              {
                position: 'absolute',
                top: dropdownLayout.y,
                left: Math.max(16, Math.min(dropdownLayout.x, screenWidth - minWidth - 16)),
                width: Math.max(minWidth, dropdownLayout.width),
                maxWidth: Math.min(maxWidth, screenWidth - 32),
                maxHeight,
                backgroundColor: theme.colors.background.secondary,
                borderColor: theme.colors.primary[500],
                ...theme.shadows.large,
                zIndex: 9999,
              }
            ]}
          >
            {/* Search Input */}
            <View style={[styles.searchContainer, {
              borderBottomColor: theme.colors.border.light,
            }]}>
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, {
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.primary,
                  borderColor: theme.colors.border.light,
                  height: 36,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  fontSize: 14,
                }]}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.tertiary}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                autoFocus={Platform.OS === 'web'}
              />
            </View>

            {/* Options List */}
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={true}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor: item === value 
                        ? theme.colors.primary[50] 
                        : 'transparent',
                      borderLeftColor: item === value 
                        ? theme.colors.primary[500] 
                        : 'transparent',
                    }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text 
                    variant="body2" 
                    color={item === value ? 'primary' : 'secondary'}
                    style={{ fontWeight: item === value ? '600' : '400' }}
                  >
                    {item === 'all' ? 'All Venues' : item}
                  </Text>
                  {item === value && (
                    <Text variant="body2" color="primary">
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text variant="body2" color="tertiary" style={styles.emptyText}>
                    No venues found
                  </Text>
                </View>
              }
            />
          </View>
        </Portal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputText: {
    flex: 1,
  },
  arrow: {
    marginLeft: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchContainer: {
    padding: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
  },
  list: {
    maxHeight: 150,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
  },
});