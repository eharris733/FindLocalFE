import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from './Text';
import { useCommunity } from '../../context/CommunityContext';

interface CommunityPickerProps {
  showTrigger?: boolean;
  initiallyOpen?: boolean;
  onClose?: () => void;
}

export const CommunityPicker: React.FC<CommunityPickerProps> = ({
  showTrigger = true,
  initiallyOpen = false,
  onClose,
}) => {
  const { theme } = useTheme();
  const { selectedCommunities, allCommunities, onCommunitiesChange, loading } = useCommunity();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [pendingSelection, setPendingSelection] = useState<string[]>(selectedCommunities);

  // Sync pending selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingSelection(selectedCommunities);
    }
  }, [isOpen, selectedCommunities]);

  const handleToggleCommunity = (communityName: string) => {
    if (communityName === 'all') {
      setPendingSelection([]);
    } else {
      const newSelection = pendingSelection.includes(communityName)
        ? pendingSelection.filter(c => c !== communityName)
        : [...pendingSelection, communityName];
      
      setPendingSelection(newSelection);
    }
  };

  const handleModalClose = async () => {
    // Apply changes only when closing
    await onCommunitiesChange(pendingSelection);
    setIsOpen(false);
    onClose?.();
  };

  const isAllSelected = pendingSelection.length === 0;

  const formatCommunityName = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'theater') {
      return 'Theater';
    }
    if (lower === 'culture') {
      return 'Culture';
    }
    if (lower === 'dance'){
      return 'Dance';
    }
    // Default: capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const getDisplayText = () => {
    if (isAllSelected) return 'Everything';
    if (pendingSelection.length === 1) return formatCommunityName(pendingSelection[0]);
    if (pendingSelection.length === 2) return pendingSelection.map(formatCommunityName).join(' • ');
    return `${pendingSelection.length} Communities`;
  };

  return (
    <>
      {showTrigger && (
        <TouchableOpacity
          style={[styles.trigger, { backgroundColor: 'transparent' }]}
          onPress={() => setIsOpen(true)}
        >
          <View style={styles.triggerContent}>
            <Text variant="h3" color="primary">
              {getDisplayText()}
            </Text>
            <Text variant="body2" color="secondary" style={styles.arrow}>▼</Text>
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
              <Text variant="h2" color="primary">Select Communities</Text>
              <TouchableOpacity onPress={handleModalClose}>
                <Text variant="h3" color="secondary">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Community List */}
            <ScrollView style={styles.communityList} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                  <Text variant="body1" color="secondary" style={styles.loadingText}>
                    Loading communities...
                  </Text>
                </View>
              ) : allCommunities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text variant="h4" color="tertiary" style={{ textAlign: 'center', marginBottom: 8, fontSize: 32 }}>🎭</Text>
                  <Text variant="h4" color="primary" style={{ textAlign: 'center', marginBottom: 8 }}>
                    No Communities Yet
                  </Text>
                  <Text variant="body2" color="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>
                    Communities need to be added to the database. Check the communities table in Supabase.
                  </Text>
                </View>
              ) : (
                <>
                  {/* All Communities Option */}
                  <TouchableOpacity
                    style={[
                      styles.communityOption,
                      {
                        backgroundColor: isAllSelected
                          ? theme.colors.primary[50]
                          : 'transparent',
                        borderColor: theme.colors.border.light,
                      }
                    ]}
                    onPress={() => handleToggleCommunity('all')}
                  >
                    <View style={styles.communityRow}>
                      <Text variant="h4" style={{ fontSize: 24 }}>🌍</Text>
                      <Text
                        variant="h4"
                        color={isAllSelected ? 'primary' : 'secondary'}
                        style={{ fontWeight: isAllSelected ? '700' : '600', marginLeft: 12 }}
                      >
                        All Communities
                      </Text>
                    </View>
                    {isAllSelected && (
                      <Text variant="body1" color="primary">✓</Text>
                    )}
                  </TouchableOpacity>

                  {/* Individual Communities */}
                  {allCommunities.map((community) => {
                    const isSelected = pendingSelection.includes(community.name);
                    return (
                      <View
                        key={community.id}
                        style={{
                          borderLeftWidth: 4,
                          borderLeftColor: isSelected
                            ? community.metadata.color
                            : 'transparent',
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.communityOption,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primary[50]
                                : 'transparent',
                              borderColor: theme.colors.border.light,
                              marginVertical: 0,
                            }
                          ]}
                          onPress={() => handleToggleCommunity(community.name)}
                        >
                          <View style={styles.communityRow}>
                            <Text variant="h4" style={{ fontSize: 24 }}>
                              {community.metadata.icon}
                            </Text>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <Text
                                variant="h4"
                                color={isSelected ? 'primary' : 'secondary'}
                                style={{ fontWeight: isSelected ? '700' : '600' }}
                              >
                                {formatCommunityName(community.name)}
                              </Text>
                              {community.description && (
                                <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                                  {community.description}
                                </Text>
                              )}
                            </View>
                          </View>
                          {isSelected && (
                            <Text variant="body1" color="primary">✓</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            {/* Footer with selected count */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border.light, backgroundColor: theme.colors.background.secondary }]}>
              <Text variant="body2" color="secondary">
                {isAllSelected
                  ? 'Showing all communities'
                  : `${pendingSelection.length} ${pendingSelection.length === 1 ? 'community' : 'communities'} selected`}
              </Text>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.colors.primary[500] }]}
                onPress={handleModalClose}
              >
                <Text variant="body2" color="inverse" style={{ fontWeight: '600' }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    fontSize: 14,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  communityList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  communityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
