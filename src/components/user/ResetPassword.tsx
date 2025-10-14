import React, {useState} from "react";
import {Controller, useForm} from "react-hook-form";
import {supabase} from "../../supabase";
import {Button, Text} from "../ui";
import {ActivityIndicator, View, StyleSheet, TouchableOpacity} from "react-native";
import Input from "../ui/Input";
import {useRouter} from "expo-router";
import { useTheme } from "../../context/ThemeContext";

type RestFormValues = {
    newPassword: string;
    confirmPassword: string;
}

export default function ResetPassword() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch
    } = useForm<RestFormValues>({
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const password = watch('newPassword');

    // Check if user has a valid session on mount
    React.useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setHasSession(!!session);
            if (!session) {
                setFeedback('Your password reset link has expired or is invalid. Please request a new one.');
            }
        };
        checkSession();
    }, []);

    const styles = StyleSheet.create({
        container: {
            gap: 16,
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background.primary,
            opacity: 0.8,
            zIndex: 1000,
        },
        feedbackContainer: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: theme.colors.background.secondary,
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.info,
            marginBottom: 8,
        },
        successContainer: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: theme.colors.background.secondary,
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.success,
            marginBottom: 8,
        },
        feedbackText: {
            color: theme.colors.text.primary,
        },
        buttonContainer: {
            gap: 12,
            marginTop: 8,
        },
        infoBox: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: theme.colors.background.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.light,
            marginBottom: 12,
        },
        linkContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
        },
        linkText: {
            color: theme.colors.primary[500],
            fontWeight: '600' as const,
        },
    });

    async function passwordReset(values: RestFormValues) {
        try {
            setLoading(true);
            
            // Verify we still have a valid session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setFeedback('Your session has expired. Please request a new password reset link.');
                setSuccess(false);
                setHasSession(false);
                return;
            }
            
            const { data, error } = await supabase.auth.updateUser({ password: values.newPassword });
            if (error) {
                setFeedback(error.message);
                setSuccess(false);
                return;
            }
            setFeedback('Password updated successfully! You can now sign in with your new password.');
            setSuccess(true);
            
            // Auto-redirect after 2 seconds
            setTimeout(() => {
                router.push('/user/signin');
            }, 2000);
        } catch (e: any) {
            setFeedback(e?.message || 'Failed to update password');
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
            )}
            
            {feedback && (
                <View style={success ? styles.successContainer : styles.feedbackContainer}>
                    <Text variant="body2" style={styles.feedbackText}>
                        {feedback}
                    </Text>
                </View>
            )}

            {hasSession === null ? (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                </View>
            ) : hasSession === false ? (
                <View style={styles.buttonContainer}>
                    <Button 
                        title="Request New Reset Link" 
                        variant="primary" 
                        onPress={() => router.push('/user/signin')}
                        fullWidth
                    />
                </View>
            ) : (
                <>
                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary">
                            Enter your new password below. Make sure it's at least 6 characters long.
                        </Text>
                    </View>

                    <Controller
                control={control}
                rules={{
                    required: 'Password is required',
                    minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                    },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="New Password"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        secureTextEntry
                        placeholder="Enter new password (min. 6 characters)"
                        autoCapitalize='none'
                        error={errors.newPassword?.message}
                    />
                )}
                name="newPassword"
            />

            <Controller
                control={control}
                rules={{
                    required: 'Please confirm your password',
                    validate: (value: string) => value === password || 'Passwords do not match',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Confirm Password"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        secureTextEntry
                        placeholder="Re-enter your new password"
                        autoCapitalize='none'
                        error={errors.confirmPassword?.message}
                    />
                )}
                name="confirmPassword"
            />

                    <View style={styles.buttonContainer}>
                        <Button 
                            title="Update Password" 
                            variant="primary" 
                            onPress={handleSubmit(passwordReset)}
                            loading={loading}
                            fullWidth
                        />
                        {success && (
                            <Button 
                                title="Go to Sign In" 
                                variant="outline" 
                                onPress={() => router.push('/user/signin')}
                                fullWidth
                            />
                        )}
                    </View>

                    {!success && (
                        <View style={styles.linkContainer}>
                            <TouchableOpacity onPress={() => router.push('/user/signin')}>
                                <Text variant="body2" style={styles.linkText}>
                                    Back to Sign In
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </View>
    )
}