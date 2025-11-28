import {StyleSheet, View, TouchableOpacity} from 'react-native'
import { Text, CityPicker, CommunityPicker} from "../../components/ui";
import {useAuth} from "../../hooks/useAuth";
import PageView from "../../components/ui/PageView";
import SignOutButton from "../../components/user/SignOutButton";
import { useCityLocation } from "../../context/CityContext";
import { useCommunity } from "../../context/CommunityContext";
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileRoute() {
    const { profile } = useAuth();
    const { theme } = useTheme();
    const { selectedCity, selectedRegions, onCityChange, onRegionsChange } = useCityLocation();
    const { selectedCommunities } = useCommunity();
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [showCommunityPicker, setShowCommunityPicker] = useState(false);

    return (
        <PageView title="Profile & Settings">
            <View style={styles.titleContainer}>
                <Text variant="h3">Welcome!</Text>
            </View>
            
            {profile && (
                <View style={styles.stepContainer}>
                    <Text variant="body1">{profile?.username}</Text>
                    <Text variant="body2" color="secondary">{profile?.full_name}</Text>
                </View>
            )}

            {/* City Settings */}
            <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                <Text variant="caption" color="tertiary" style={styles.sectionLabel}>LOCATION</Text>
                <TouchableOpacity 
                    style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                    onPress={() => setShowCityPicker(true)}
                >
                    <View style={styles.settingInfo}>
                        <Text variant="body1" style={styles.settingTitle}>City</Text>
                        <Text variant="body2" color="secondary">{selectedCity}</Text>
                    </View>
                    <Text variant="body2" color="tertiary">›</Text>
                </TouchableOpacity>
            </View>

            {/* Community Settings */}
            <View style={styles.settingSection}>
                <Text variant="caption" color="tertiary" style={styles.sectionLabel}>COMMUNITIES</Text>
                <TouchableOpacity 
                    style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                    onPress={() => setShowCommunityPicker(true)}
                >
                    <View style={styles.settingInfo}>
                        <Text variant="body1" style={styles.settingTitle}>Selected Communities</Text>
                        <Text variant="body2" color="secondary">
                            {selectedCommunities.length === 0 
                                ? 'Everything' 
                                : selectedCommunities.join(', ')}
                        </Text>
                    </View>
                    <Text variant="body2" color="tertiary">›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.settingSection}>
                <SignOutButton />
            </View>

            {/* City Picker Modal */}
            {showCityPicker && (
                <CityPicker
                    selectedCity={selectedCity}
                    onCityChange={onCityChange}
                    selectedRegions={selectedRegions}
                    onRegionsChange={onRegionsChange}
                    initiallyOpen={true}
                    showTrigger={false}
                    onClose={() => setShowCityPicker(false)}
                />
            )}

            {/* Community Picker Modal */}
            {showCommunityPicker && (
                <CommunityPicker
                    initiallyOpen={true}
                    showTrigger={false}
                    onClose={() => setShowCommunityPicker(false)}
                />
            )}
        </PageView>
    )
}
const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    stepContainer: {
        gap: 4,
        marginBottom: 24,
        paddingBottom: 16,
    },
    settingSection: {
        marginBottom: 24,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    sectionLabel: {
        marginBottom: 12,
        marginLeft: 4,
        fontSize: 11,
        fontWeight: '700',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    settingInfo: {
        flex: 1,
        gap: 4,
    },
    settingTitle: {
        fontWeight: '600',
    },
})