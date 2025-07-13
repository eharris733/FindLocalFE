import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';

interface TabNavigationProps {
  activeTab: 'list' | 'map';
  onTabChange: (tab: 'list' | 'map') => void;
} 

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
      ...theme.shadows.small,
    }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: theme.colors.background.secondary },
          activeTab === 'list' && { backgroundColor: theme.colors.primary[500] }
        ]}
        onPress={() => onTabChange('list')}
      >
        <Text 
          variant="button" 
          color={activeTab === 'list' ? 'inverse' : 'secondary'}
          style={activeTab === 'list' && { fontWeight: '600' }}
        >
          📋 List
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: theme.colors.background.secondary },
          activeTab === 'map' && { backgroundColor: theme.colors.primary[500] }
        ]}
        onPress={() => onTabChange('map')}
      >
        <Text 
          variant="button" 
          color={activeTab === 'map' ? 'inverse' : 'secondary'}
          style={activeTab === 'map' && { fontWeight: '600' }}
        >
          🗺️ Map
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default TabNavigation;