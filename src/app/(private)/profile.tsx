import {StyleSheet, View, TouchableOpacity, TextInput, Modal, ScrollView, Image, ActivityIndicator, Alert, Platform} from 'react-native'
import { Text, CityPicker, CommunityPicker, Button} from "../../components/ui";
import { ThemeToggle } from '../../components/ui/ThemeToggle';
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
    updateMarketingOptIn,
    deleteUserAccount,
    AccountType,
    ActivityVisibility
} from '../../api/profiles';
import { getFollowerCount, getFollowingCount } from '../../api/friends';
import { getUserAttendedCount } from '../../api/invitations';
import EventHistory from '../../components/EventHistory';
import FeedbackModal from '../../components/FeedbackModal';
import { logger } from '../../utils/logger';
import { openLink } from '../../utils/linkUtils';

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
    const [attendedCount, setAttendedCount] = useState(0);
    const [showEventHistory, setShowEventHistory] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [updatingOptIn, setUpdatingOptIn] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        if (profile) {
            setAccountType(profile.account_type || 'personal');
            setBio(profile.bio || '');
            if (profile.marketing_opt_in !== undefined && profile.marketing_opt_in !== null) {
                setMarketingOptIn(profile.marketing_opt_in);
            }
        }
    }, [profile]);

    // Load follower/following counts and attended count
    useEffect(() => {
        let isMounted = true;
        const loadCounts = async () => {
            if (session?.user?.id) {
                const [followers, following, attended] = await Promise.all([
                    getFollowerCount(session.user.id),
                    getFollowingCount(session.user.id),
                    getUserAttendedCount(),
                ]);
                if (isMounted) {
                    if (!followers.error) setFollowerCount(followers.count);
                    if (!following.error) setFollowingCount(following.count);
                    if (!attended.error) setAttendedCount(attended.count);
                }
            }
        };
        loadCounts();
        return () => { isMounted = false; };
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

    const handleMarketingOptInToggle = async () => {
        if (!session?.user?.id) return;

        const newValue = !marketingOptIn;
        setMarketingOptIn(newValue);
        setUpdatingOptIn(true);

        try {
            const { error } = await updateMarketingOptIn(session.user.id, newValue);
            if (error) {
                logger.error('Error updating marketing opt-in:', error);
                setMarketingOptIn(!newValue);
            }
        } catch (err) {
            logger.error('Error updating marketing opt-in:', err);
            setMarketingOptIn(!newValue);
        } finally {
            setUpdatingOptIn(false);
        }
    };

    const handleDeleteAccount = () => {
        const confirmationMessage =
            'Are you absolutely sure you want to delete your account?\n\n' +
            'This action cannot be undone. All your data including:\n' +
            '• Your profile information\n' +
            '• Saved favorites\n' +
            '• Preferences and settings\n\n' +
            'will be permanently deleted.';

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Delete Account\n\n${confirmationMessage}`);
            if (confirmed) {
                confirmDeleteAccount();
            }
        } else {
            Alert.alert(
                'Delete Account',
                confirmationMessage,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete Account', style: 'destructive', onPress: confirmDeleteAccount },
                ],
                { cancelable: true }
            );
        }
    };

    const confirmDeleteAccount = async () => {
        if (!session?.user?.id) return;

        setDeletingAccount(true);

        try {
            const { success, error } = await deleteUserAccount(session.user.id);

            if (error || !success) {
                logger.error('Error deleting account:', error);
                const errorMsg = 'Failed to delete account. Please try again or contact support.';
                if (Platform.OS === 'web') {
                    window.alert(errorMsg);
                } else {
                    Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
                }
                return;
            }

            const successMsg = 'Your account has been successfully deleted.';
            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert('Account Deleted', successMsg, [{ text: 'OK', onPress: () => router.replace('/') }]);
            }
            router.replace('/');
        } catch (err) {
            logger.error('Error in confirmDeleteAccount:', err);
            const errorMsg = 'An unexpected error occurred. Please try again.';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
            }
        } finally {
            setDeletingAccount(false);
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
                                <TouchableOpacity
                                    style={[styles.statItem, { backgroundColor: theme.colors.secondary[500] + '20' }]}
                                    onPress={() => setShowEventHistory(true)}
                                >
                                    <Text variant="h4" style={{ color: theme.colors.secondary[500] }}>
                                        {attendedCount}
                                    </Text>
                                    <Text variant="caption" color="secondary">ATTENDED</Text>
                                </TouchableOpacity>
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

                {/* Navigation Links */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>QUICK ACCESS</Text>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => router.push('/followed-venues')}
                    >
                        <Text variant="body1">🏛️ Followed Venues</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => router.push('/my-invites')}
                    >
                        <Text variant="body1">✉️ My Invitations</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={() => router.push('/discover-creators')}
                    >
                        <Text variant="body1">🎭 Discover Creators</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
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

                {/* Location Settings */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>PREFERENCES</Text>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => setShowCityPicker(true)}
                    >
                        <View style={styles.settingInfo}>
                            <Text variant="body1" style={styles.settingTitle}>Default Location</Text>
                            <Text variant="body2" color="secondary">{selectedCity}</Text>
                        </View>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => setShowCommunityPicker(true)}
                    >
                        <View style={styles.settingInfo}>
                            <Text variant="body1" style={styles.settingTitle}>Communities</Text>
                            <Text variant="body2" color="secondary">
                                {selectedCommunities.length === 0 ? 'Everything' : selectedCommunities.join(', ')}
                            </Text>
                        </View>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.checkboxRow, { backgroundColor: theme.colors.background.secondary, padding: 16, borderRadius: 12 }]}
                        onPress={handleMarketingOptInToggle}
                        activeOpacity={0.7}
                        disabled={updatingOptIn}
                    >
                        <View style={[
                            styles.checkbox,
                            { borderColor: theme.colors.border.light },
                            marketingOptIn && [styles.checkboxChecked, { backgroundColor: theme.colors.primary[500] }]
                        ]}>
                            {marketingOptIn && (
                                <View style={[styles.checkboxInner, { backgroundColor: theme.colors.background.primary }]} />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text variant="body1" style={styles.settingTitle}>Email Updates</Text>
                            <Text variant="body2" color="secondary">
                                Receive event recommendations and FindLocal updates
                            </Text>
                        </View>
                        {updatingOptIn && (
                            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Appearance Section */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>APPEARANCE</Text>
                    <View style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}>
                        <View style={styles.settingInfo}>
                            <Text variant="body1" style={styles.settingTitle}>Theme</Text>
                            <Text variant="body2" color="secondary">
                                Choose how FindLocal looks to you
                            </Text>
                        </View>
                        <ThemeToggle showLabel={true} />
                    </View>
                </View>

                {/* Event History Section */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>HISTORY</Text>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={() => setShowEventHistory(true)}
                    >
                        <View style={styles.settingInfo}>
                            <Text variant="body1" style={styles.settingTitle}>View Past Events</Text>
                            <Text variant="body2" color="secondary">
                                See events you attended and hosted
                            </Text>
                        </View>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                </View>

                {/* Help Us Improve Section */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>HELP US IMPROVE</Text>
                    <View style={[styles.helpCard, { backgroundColor: theme.colors.background.secondary }]}>
                        <Text variant="body1" style={styles.settingTitle}>Share Your Feedback</Text>
                        <Text variant="body2" color="secondary" style={{ marginTop: 4, marginBottom: 12, lineHeight: 20 }}>
                            Have a bug to report, feature to suggest, or just want to share your thoughts?
                        </Text>
                        <Button
                            variant="primary"
                            title="Give Feedback"
                            onPress={() => setShowFeedbackModal(true)}
                        />
                    </View>
                    <View style={[styles.helpCard, { backgroundColor: theme.colors.background.secondary, marginTop: 12 }]}>
                        <Text variant="body1" style={styles.settingTitle}>Become a Beta Tester</Text>
                        <Text variant="body2" color="secondary" style={{ marginTop: 4, marginBottom: 12, lineHeight: 20 }}>
                            Get notified about updates and perks for beta testers!
                        </Text>
                        <Button
                            variant="outline"
                            title="Sign Up for Beta Testing"
                            onPress={() => openLink('https://forms.gle/diBZKyejuUXsdQu46')}
                        />
                    </View>
                </View>

                {/* Legal Section */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.border.light }]}>
                    <Text variant="caption" color="tertiary" style={styles.sectionLabel}>LEGAL</Text>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => router.push('/about')}
                    >
                        <Text variant="body1">About</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary, marginBottom: 8 }]}
                        onPress={() => router.push('/terms')}
                    >
                        <Text variant="body1">Terms of Service</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.settingRow, { backgroundColor: theme.colors.background.secondary }]}
                        onPress={() => router.push('/privacy')}
                    >
                        <Text variant="body1">Privacy Policy</Text>
                        <Text variant="body2" color="tertiary">›</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <View style={styles.settingSection}>
                    <SignOutButton />
                </View>

                {/* Danger Zone */}
                <View style={[styles.settingSection, { borderTopColor: theme.colors.error, borderTopWidth: 2 }]}>
                    <Text variant="caption" style={[styles.sectionLabel, { color: theme.colors.error }]}>DANGER ZONE</Text>
                    <View style={[styles.helpCard, { backgroundColor: theme.colors.background.secondary }]}>
                        <Text variant="body2" color="secondary" style={{ marginBottom: 16, lineHeight: 20 }}>
                            Once you delete your account, there is no going back. All your data will be permanently deleted.
                        </Text>
                        <Button
                            variant="outline"
                            title={deletingAccount ? "Deleting..." : "Delete Account"}
                            onPress={handleDeleteAccount}
                            disabled={deletingAccount}
                            style={{ borderColor: theme.colors.error }}
                        />
                        {deletingAccount && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                                <ActivityIndicator size="small" color={theme.colors.error} />
                                <Text variant="body2" color="secondary" style={{ marginLeft: 8 }}>
                                    Deleting your account...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 100 }} />
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

            {/* Event History Modal */}
            <Modal
                visible={showEventHistory}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEventHistory(false)}
            >
                <View style={[styles.eventHistoryModal, { backgroundColor: theme.colors.background.primary }]}>
                    <View style={styles.eventHistoryHeader}>
                        <Text variant="h3">Event History</Text>
                        <TouchableOpacity
                            onPress={() => setShowEventHistory(false)}
                            style={styles.closeButton}
                        >
                            <Text variant="body1" style={{ color: theme.colors.primary[500] }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <EventHistory
                        onEventPress={(eventId) => {
                            setShowEventHistory(false);
                            router.push(`/event/${eventId}`);
                        }}
                    />
                </View>
            </Modal>

            {/* Feedback Modal */}
            <FeedbackModal
                visible={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
            />
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
    eventHistoryModal: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 16,
    },
    eventHistoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    closeButton: {
        padding: 8,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        borderColor: 'transparent',
    },
    checkboxInner: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    helpCard: {
        padding: 16,
        borderRadius: 12,
    },
});