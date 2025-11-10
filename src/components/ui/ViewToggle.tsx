import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';

interface ViewToggleProps {
  viewMode: 'gallery' | 'list' | 'map';
  onViewModeChange: (mode: 'gallery' | 'list' | 'map') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[
      styles.toggleContainer,
      {
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.light,
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          {
            backgroundColor: viewMode === 'list' 
              ? theme.colors.primary[500] 
              : 'transparent',
          }
        ]}
        onPress={() => onViewModeChange('list')}
      >
        <Text 
          variant="body2" 
          color={viewMode === 'list' ? 'inverse' : 'secondary'}
          style={styles.toggleText}
        >
          List
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.toggleButton,
          {
            backgroundColor: viewMode === 'gallery' 
              ? theme.colors.primary[500] 
              : 'transparent',
          }
        ]}
        onPress={() => onViewModeChange('gallery')}
      >
        <Text 
          variant="body2" 
          color={viewMode === 'gallery' ? 'inverse' : 'secondary'}
          style={styles.toggleText}
        >
          Gallery
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.toggleButton,
          {
            backgroundColor: viewMode === 'map' 
              ? theme.colors.primary[500] 
              : 'transparent',
          }
        ]}
        onPress={() => onViewModeChange('map')}
      >
        <Text 
          variant="body2" 
          color={viewMode === 'map' ? 'inverse' : 'secondary'}
          style={styles.toggleText}
        >
          Map
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
