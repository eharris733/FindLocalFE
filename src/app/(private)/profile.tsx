import {StyleSheet, View, TouchableOpacity, TextInput, Modal, ScrollView, Image, ActivityIndicator} from 'react-native'
import { Text, CityPicker, CommunityPicker, Button} from "../../components/ui";
import {useAuth} from "../../hooks/useAuth";
import PageView from "../../components/ui/PageView";
import SignOutButton from "../../components/user/SignOutButton";
import { useCityLocation } from "../../context/CityContext";
import { useCommunity } from "../../context/CommunityContext";
import { useFriends } from "../../context/FriendsContext";
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { 
    updateUsername, 
    updateAccountType, 
    updateActivityVisibility, 
    updateBio,
    checkUsernameAvailability,
    AccountType,
    ActivityVisibility 
} from '../../api/profiles';
import { getFollowerCount, getFollowingCount } from '../../api/friends';
import { logger } from '../../utils/logger';

// Username Edit Modal Component
function UsernameEditModal({
    visible,
    currentUsername,
    onClose,
    onSave,
}: {
    visible: boolean;
    currentUsername: string;
    onClose: () => void;
    onSave: (username: string) => Promise<void>;
}) {
    const { theme } = useTheme();
    const [username, setUsername] = useState(currentUsername);
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setUsername(currentUsername);
        setIsAvailable(null);
        setError(null);
    }, [currentUsername, visible]);

    // Check username availability with debounce
    useEffect(() => {
        if (username === currentUsername) {
            setIsAvailable(null);
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            setIsAvailable(false);
            setError('3-20 characters, letters, numbers, underscores only');
            return;
        }

        setIsChecking(true);
        const timeout = setTimeout(async () => {
            const { available } = await checkUsernameAvailability(username);
            setIsAvailable(available);
            setError(available ? null : 'Username is taken');
            setIsChecking(false);
        }, 500);

        return () => clearTimeout(timeout);
    }, [username, currentUsername]);

    const handleSave = async () => {
        if (!isAvailable || username === currentUsername) return;
        setIsSaving(true);
        await onSave(username);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
                    <Text variant="h4" style={{ marginBottom: 16 }}>Edit Username</Text>
                    
                    <View style={[styles.usernameInputContainer, { 
                        borderColor: error ? theme.colors.error : 
                                    isAvailable ? theme.colors.success : 
                                    theme.colors.border.medium 
                    }]}>
                        <Text variant="body1" color="tertiary">@</Text>
                        <TextInput
                            style={[styles.usernameInput, { color: theme.colors.text.primary }]}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholder="username"
                            placeholderTextColor={theme.colors.text.tertiary}
                        />
                        {isChecking && <ActivityIndicator size="small" />}
                        {!isChecking && isAvailable === true && (
                            <Text style={{ color: theme.colors.success }}>✓</Text>
                        )}
                        {!isChecking && isAvailable === false && (
                            <Text style={{ color: theme.colors.error }}>✕</Text>
                        )}
                    </View>
                    
                    {error && (
                        <Text variant="caption" color="error" style={{ marginTop: 4 }}>
                            {error}
                        </Text>
                    )}

                    <View style={styles.modalButtons}>
                        <Button 
                            title="Cancel" 
                            variant="ghost" 
                            onPress={onClose}
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <Button 
                            title={isSaving ? "Saving..." : "Save"}
                            variant="primary" 
                            onPress={handleSave}
                            disabled={!isAvailable || isSaving || username === currentUsername}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// Visibility Settings Modal Component
function VisibilitySettingsModal({
    visible,
    currentVisibility,
    onClose,
    onSave,
}: {
    visible: boolean;
    currentVisibility: ActivityVisibility;
    onClose: () => void;
    onSave: (visibility: ActivityVisibility) => Promise<void>;
}) {
    const { theme } = useTheme();
    const [selected, setSelected] = useState<ActivityVisibility>(currentVisibility);

    useEffect(() => {
        setSelected(currentVisibility);
    }, [currentVisibility, visible]);

    const options: { value: ActivityVisibility; label: string; description: string }[] = [
        { value: 'everyone', label: 'Everyone', description: 'Anyone can see your activity' },
        { value: 'friends', label: 'Friends Only', description: 'Only mutual friends can see' },
        { value: 'followers', label: 'Followers', description: 'Friends and followers can see' },
        { value: 'none', label: 'Private', description: 'No one can see your activity' },
    ];

    const handleSave = async () => {
        await onSave(selected);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
                    <Text variant="h4" style={{ marginBottom: 8 }}>Activity Visibility</Text>
                    <Text variant="body2" color="secondary" style={{ marginBottom: 16 }}>
                        Who can see events you're attending or hosting?
                    </Text>

                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.visibilityOption,
                                { 
                                    backgroundColor: selected === option.value 
                                        ? theme.colors.primary[500] + '15' 
                                        : theme.colors.background.secondary,
                                    borderColor: selected === option.value 
                                        ? theme.colors.primary[500] 
                                        : theme.colors.border.light,
                                }
                            ]}
                            onPress={() => setSelected(option.value)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text variant="body1" style={{ fontWeight: '500' }}>
                                    {option.label}
                                </Text>
                                <Text variant="caption" color="secondary">
                                    {option.description}
                                </Text>
                            </View>
                            {selected === option.value && (
                                <Text style={{ color: theme.colors.primary[500], fontSize: 18 }}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}

                    <View style={styles.modalButtons}>
                        <Button 
                            title="Cancel" 
                            variant="ghost" 
                            onPress={onClose}
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <Button 
                            title="Save"
                            variant="primary" 
                            onPress={handleSave}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default function ProfileRoute() {
    const { profile, session, refreshProfile } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const { selectedCity, selectedRegions, onCityChange, onRegionsChange } = useCityLocation();
    const { selectedCommunities } = useCommunity();
    const { stats } = useFriends();
    
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [showCommunityPicker, setShowCommunityPicker] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    
    // Local state for profile data
    const [accountType, setAccountType] = useState<AccountType>(profile?.account_type || 'personal');
    const [bio, setBio] = useState(profile?.bio || '');
    const [isEditingBio, setIsEditingBio] = useState(false);
    
    // Follower/Following counts for creators
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    useEffect(() => {
        if (profile) {
            setAccountType(profile.account_type || 'personal');
            setBio(profile.bio || '');
        }
    }, [profile]);
    
    // Load follower/following counts
    useEffect(() => {
        const loadFollowCounts = async () => {
            if (session?.user?.id) {
                const [followers, following] = await Promise.all([
                    getFollowerCount(session.user.id),
                    getFollowingCount(session.user.id),
                ]);
                setFollowerCount(followers.count);
                setFollowingCount(following.count);
            }
        };
        loadFollowCounts();
    }, [session?.user?.id]);

    const handleUsernameUpdate = async (newUsername: string) => {
        if (!session?.user?.id) return;
        const { error } = await updateUsername(session.user.id, newUsername);
        if (error) {
            logger.error('Error updating username:', error);
        } else {
            // Refresh profile to update UI
            await refreshProfile?.();
        }
    };

    const handleAccountTypeToggle = async () => {
        if (!session?.user?.id) return;
        const previousType = accountType;
        const newType: AccountType = accountType === 'personal' ? 'creator' : 'personal';
        setAccountType(newType);
        const { error } = await updateAccountType(session.user.id, newType);
        if (error) {
            logger.error('Error updating account type:', error);
            setAccountType(previousType); // Revert on error
        } else {
            await refreshProfile?.();
        }
    };

    const handleVisibilityUpdate = async (visibility: ActivityVisibility) => {
        if (!session?.user?.id) return;
        const { error } = await updateActivityVisibility(session.user.id, visibility);
        if (error) {
            logger.error('Error updating visibility:', error);
        } else {
            await refreshProfile?.();
        }
    };

    const handleBioSave = async () => {
        if (!session?.user?.id) return;
        const { error } = await updateBio(session.user.id, bio);
        if (error) {
            logger.error('Error updating bio:', error);
        } else {
            await refreshProfile?.();
        }
        setIsEditingBio(false);
    };

    const getVisibilityLabel = (visibility?: ActivityVisibility | null): string => {
        switch (visibility) {
            case 'everyone': return 'Everyone';
            case 'friends': return 'Friends Only';
            case 'followers': return 'Followers';
            case 'none': return 'Private';
            default: return 'Friends Only';
        }
    };

    // Avatar component
    const renderAvatar = () => {
        const initials = profile?.full_name
            ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : profile?.username?.[0]?.toUpperCase() || '?';

        return (
            <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                    <Image
                        source={{ uri: profile.avatar_url }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.colors.primary[500] }]}>
                        <Text variant="h2" style={{ color: '#FFFFFF' }}>{initials}</Text>
                    </View>
                )}
                <TouchableOpacity 
                    style={[styles.editAvatarButton, { backgroundColor: theme.colors.secondary[500] }]}
                    onPress={() => {/* TODO: Implement avatar upload */}}
                >
                    <Text style={{ color: '#FFFFFF', fontSize: 12 }}>✎</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <PageView title="">
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Back Button */}
                <View style={styles.pageHeader}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text variant="body1" style={{ color: theme.colors.primary[500] }}>
                            ← Back
                        </Text>
                    </TouchableOpacity>
                    <Text variant="h3" style={{ flex: 1, textAlign: 'center' }}>
                        Profile & Settings
                    </Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Account Type Toggle */}
                <View style={[styles.accountTypeToggle, { backgroundColor: theme.colors.background.secondary }]}>
                    <TouchableOpacity
                        style={[
                            styles.accountTypeOption,
                            accountType === 'personal' && { backgroundColor: theme.colors.background.primary }
                        ]}
                        onPress={() => accountType !== 'personal' && handleAccountTypeToggle()}
                    >
                        <Text variant="body2" style={{ fontWeight: accountType === 'personal' ? '600' : '400' }}>
                            👤 PERSONAL
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.accountTypeOption,
                            accountType === 'creator' && { backgroundColor: theme.colors.background.primary }
                        ]}
                        onPress={() => accountType !== 'creator' && handleAccountTypeToggle()}
                    >
                        <Text variant="body2" style={{ fontWeight: accountType === 'creator' ? '600' : '400' }}>
                            🎭 CREATOR
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    {renderAvatar()}
                    
                    <Text variant="h3" style={{ marginTop: 12, textAlign: 'center' }}>
                        {profile?.full_name || 'Set your name'}
                    </Text>
                    
                    <TouchableOpacity onPress={() => setShowUsernameModal(true)}>
                        <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
                            @{profile?.username || 'set_username'}
                        </Text>
                    </TouchableOpacity>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {accountType === 'creator' ? (
                            // Creator stats: Followers, Following, Saved
                            <>
                                <TouchableOpacity
                                    style={[styles.statItem, { backgroundColor: theme.colors.primary[500] + '20' }]}
                                    onPress={() => router.push('/followers?tab=followers')}
                                >
                                    <Text variant="h4" style={{ color: theme.colors.primary[500] }}>
                                        {followerCount}
                                    </Text>
                                    <Text variant="caption" color="secondary">FOLLOWERS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.statItem, { backgroundColor: theme.colors.secondary[500] + '20' }]}
                                    onPress={() => router.push('/followers?tab=following')}
                                >
                                    <Text variant="h4" style={{ color: theme.colors.secondary[500] }}>
                                        {followingCount}
                                    </Text>
                                    <Text variant="caption" color="secondary">FOLLOWING</Text>
                                </TouchableOpacity>
                                <View style={[styles.statItem, { backgroundColor: theme.colors.accent[500] + '20' }]}>
                                    <Text variant="h4" style={{ color: theme.colors.accent[500] }}>
                                        {profile?.favorite_events?.length || 0}
                                    </Text>
                                    <Text variant="caption" color="secondary">SAVED</Text>
                                </View>
                            </>
                        ) : (
                            // Personal stats: Friends, Attended, Saved
                            <>
                                <TouchableOpacity
                                    style={[styles.statItem, { backgroundColor: theme.colors.primary[500] + '20' }]}
                                    onPress={() => router.push('/friends')}
                                >
                                    <Text variant="h4" style={{ color: theme.colors.primary[500] }}>
                                        {stats.friendCount}
                                    </Text>
                                    <Text variant="caption" color="secondary">FRIENDS</Text>
                                </TouchableOpacity>
                                <View style={[styles.statItem, { backgroundColor: theme.colors.secondary[500] + '20' }]}>
                                    <Text variant="h4" style={{ color: theme.colors.secondary[500] }}>
                                        {0} {/* TODO: Get attended count */}
                                    </Text>
                                    <Text variant="caption" color="secondary">ATTENDED</Text>
                                </View>
                                <View style={[styles.statItem, { backgroundColor: theme.colors.accent[500] + '20' }]}>
                                    <Text variant="h4" style={{ color: theme.colors.accent[500] }}>
                                        {profile?.favorite_events?.length || 0}
                                    </Text>
                                    <Text variant="caption" color="secondary">SAVED</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Bio Section */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>BIO</Text>
                    {isEditingBio ? (
                        <View style={[styles.bioEditContainer, { backgroundColor: theme.colors.background.secondary }]}>
                            <TextInput
                                style={[styles.bioInput, { color: theme.colors.text.primary }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell people about yourself..."
                                placeholderTextColor={theme.colors.text.tertiary}
                                multiline
                                maxLength={150}
                            />
                            <View style={styles.bioActions}>
                                <Text variant="caption" color="tertiary">{bio.length}/150</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity onPress={() => setIsEditingBio(false)}>
                                        <Text variant="body2" color="secondary">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleBioSave}>
                                        <Text variant="body2" style={{ color: theme.colors.primary[500] }}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                            onPress={() => setIsEditingBio(true)}
                        >
                            <Text variant="body2" color={bio ? 'primary' : 'tertiary'} style={{ flex: 1 }}>
                                {bio || 'Add a bio...'}
                            </Text>
                            <Text variant="body2" color="tertiary">✎</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Privacy Settings */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>PRIVACY</Text>
                    <TouchableOpacity 
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={() => setShowVisibilityModal(true)}
                    >
                        <View style={styles.settingInfo}>
                            <Text variant="body1" style={styles.settingTitle}>Activity Visibility</Text>
                            <Text variant="body2" color="secondary">
                                {getVisibilityLabel(profile?.activity_visibility)}
                            </Text>
                        </View>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                </View>

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

                {/* Bottom spacing */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modals */}
            <UsernameEditModal
                visible={showUsernameModal}
                currentUsername={profile?.username || ''}
                onClose={() => setShowUsernameModal(false)}
                onSave={handleUsernameUpdate}
            />

            <VisibilitySettingsModal
                visible={showVisibilityModal}
                currentVisibility={profile?.activity_visibility || 'friends'}
                onClose={() => setShowVisibilityModal(false)}
                onSave={handleVisibilityUpdate}
            />

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
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        minWidth: 60,
    },
    accountTypeToggle: {
        flexDirection: 'row',
        borderRadius: 25,
        padding: 4,
        marginBottom: 24,
    },
    accountTypeOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    statItem: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
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
        letterSpacing: 0.5,
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
    bioEditContainer: {
        borderRadius: 12,
        padding: 12,
    },
    bioInput: {
        fontSize: 14,
        lineHeight: 20,
        minHeight: 60,
    },
    bioActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
    },
    usernameInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    usernameInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 4,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 24,
    },
    visibilityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
});