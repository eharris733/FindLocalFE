import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, shadows } from '../theme';

interface TabNavigationProps {
  activeTab: 'list' | 'map';
  onTabChange: (tab: 'list' | 'map') => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'list' && styles.activeTab
        ]}
        onPress={() => onTabChange('list')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'list' && styles.activeTabText
        ]}>
          📋 List
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'map' && styles.activeTab
        ]}
        onPress={() => onTabChange('map')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'map' && styles.activeTabText
        ]}>
          🗺️ Map
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.small,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

export default TabNavigation;