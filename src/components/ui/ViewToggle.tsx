import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';

interface ViewToggleProps {
  viewMode: 'gallery' | 'list' | 'map';
  onViewModeChange: (mode: 'gallery' | 'list' | 'map') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useDeviceInfo();

  // On mobile, use compact icon-only buttons
  if (isMobile) {
    return (
      <View style={[
        styles.toggleContainer,
        styles.compactContainer,
        {
          backgroundColor: theme.colors.background.secondary,
          borderColor: theme.colors.border.light,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.compactButton,
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
            style={styles.iconText}
          >
            ☰
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.compactButton,
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
            style={styles.iconText}
          >
            ⊞
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.compactButton,
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
            style={styles.iconText}
          >
            🗺
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Desktop: full text labels
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
  compactContainer: {
    borderRadius: 6,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  compactButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 36,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
