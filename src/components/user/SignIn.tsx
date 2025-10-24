import { Controller, useForm} from "react-hook-form";
import {View, Platform, ActivityIndicator, StyleSheet, TouchableOpacity} from "react-native";
import {Button, Text} from "../ui";
import {supabase, getAuthRedirectUrl} from "../../supabase";
import React, {useState} from "react";
import Input from "../ui/Input";
import {useRouter} from "expo-router";
import * as Linking from "expo-linking";
import { useTheme } from "../../context/ThemeContext";
import { logger } from "../../utils/logger";

type LoginFormValues = {
    email: string;
    password: string;
    resetEmail?: string;
    linkEmail?: string;
}

export default function SignIn() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [forgotMode, setForgotMode] = useState(false);
    const [linkMode, setLinkMode] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: "",
            password: "",
            resetEmail: '',
        },
    });

    const email = watch('email');

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
        feedbackText: {
            color: theme.colors.text.primary,
        },
        buttonContainer: {
            gap: 12,
            marginTop: 8,
        },
        linkContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
        },
        infoBox: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: theme.colors.background.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.light,
            marginBottom: 12,
        },
        linkText: {
            color: theme.colors.primary[500],
            fontWeight: '600' as const,
        },
        guestContainer: {
            marginTop: 24,
            gap: 16,
        },
        divider: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 8,
        },
        dividerLine: {
            flex: 1,
            height: 1,
            backgroundColor: theme.colors.border.light,
        },
        dividerText: {
            marginHorizontal: 16,
        },
        forgotPasswordSection: {
            marginTop: 24,
            gap: 12,
        },
        legalLinksContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
        },
        legalLink: {
            color: theme.colors.primary[500],
            textDecorationLine: 'underline',
        },
    });

    async function signInWithEmail(values: LoginFormValues) {
        setLoading(true);
        setNeedsConfirmation(false);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });
            if (error) {
                // Use status codes for more reliable error handling
                // Status 400: Bad Request (wrong password, unconfirmed email, etc.)
                if (error.status === 400) {
                    // Check if it's specifically an unconfirmed email
                    // Note: We still check message as a fallback since status alone isn't specific enough
                    if (error.message.includes('Email not confirmed')) {
                        setFeedback('Your email address has not been verified. Please check your inbox for a confirmation email, or request a new one below.');
                        setNeedsConfirmation(true);
                    } else {
                        // Likely invalid email or password
                        setFeedback('Invalid email or password. Please check your credentials and try again.');
                    }
                } else if (error.status === 422) {
                    // Unprocessable Entity - validation error
                    setFeedback('Please check your email and password format.');
                } else if (error.status === 429) {
                    // Too Many Requests - rate limit
                    setFeedback('Too many sign-in attempts. Please wait a moment and try again.');
                } else {
                    // Fallback to the error message for other cases
                    setFeedback(error.message || 'Sign in failed. Please try again.');
                }
            }
        } catch (err: any) {
            logger.error('Unexpected sign in error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
            setNeedsConfirmation(false);
        } finally {
            setLoading(false);
        }
    }

    async function resendConfirmationEmail(values: LoginFormValues) {
        setLoading(true);
        try {
            const redirectTo = getAuthRedirectUrl('/auth/callback');
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: values.email.trim(),
                options: { emailRedirectTo: redirectTo },
            });
            if (error) {
                // Handle specific error cases
                if (error.status === 429) {
                    setFeedback('Too many requests. Please wait a moment before requesting another confirmation email.');
                } else if (error.status === 422) {
                    setFeedback('Invalid email address. Please check and try again.');
                } else {
                    setFeedback(`Failed to resend confirmation email: ${error.message || 'Please try again.'}`);
                }
            } else {
                setFeedback(`Confirmation email sent to ${values.email.trim()}. Please check your inbox and spam folder. The link will expire in 24 hours.`);
                setNeedsConfirmation(false);
            }
        } catch (err: any) {
            logger.error('Unexpected resend error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function signInWithGoogle() {
        setLoading(true);
        try {
            const redirectTo = Platform.OS === 'web' 
                ? `${window.location.origin}/auth/callback`
                : Linking.createURL('/auth/callback');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
            });

            if (error) {
                // Handle OAuth-specific errors
                if (error.status === 422) {
                    // Validation error - possibly account already exists with email/password
                    setFeedback('An account with this email already exists. Try signing in with email and password, or use the "Forgot Password" option.');
                    setLinkMode(true);
                } else if (error.status === 429) {
                    setFeedback('Too many requests. Please wait a moment and try again.');
                } else {
                    setFeedback(`Google sign-in failed: ${error.message || 'Please try again.'}`);
                }
            }

            if (data?.url && Platform.OS !== 'web') {
                const supported = await Linking.canOpenURL(data.url);
                if (supported) {
                    await Linking.openURL(data.url);
                } else {
                    logger.warn('Cannot open URL from Supabase OAuth', data.url);
                    setFeedback('Unable to open sign-in page. Please try again.');
                }
            }
        } catch (err: any) {
            logger.error('Unexpected Google sign-in error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function sendPasswordReset(values: LoginFormValues) {
        setLoading(true);
        const targetEmail = (values.resetEmail || email).trim();
        try {
            // Redirect to a dedicated reset page that will handle the password change
            const redirectTo = getAuthRedirectUrl('/user/reset');
            const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
            if (error) {
                // Handle password reset errors
                if (error.status === 429) {
                    setFeedback('Too many requests. Please wait a moment before requesting another password reset.');
                } else if (error.status === 422) {
                    setFeedback('Invalid email address. Please check and try again.');
                } else {
                    // For security, we don't reveal if email exists or not
                    // But we still show other errors that might occur
                    setFeedback(`Reset failed: ${error.message || 'Please try again.'}`);
                }
            } else {
                // Generic success message (don't reveal if email exists)
                setFeedback(`If an account exists with ${targetEmail}, a password reset link has been sent. Please check your email and spam folder. The link will expire in 1 hour.`);
                setForgotMode(false);
            }
        } catch (err: any) {
            logger.error('Unexpected password reset error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function sendMagicLinkForLinking(values: LoginFormValues) {
        setLoading(true);
        try {
            const redirectTo = getAuthRedirectUrl('/auth/callback');
            const { data, error } = await supabase.auth.signInWithOtp({ 
                email: values.email.trim(), 
                options: { emailRedirectTo: redirectTo } 
            });
            
            if (error) {
                // Handle magic link errors
                if (error.status === 429) {
                    setFeedback('Too many requests. Please wait a moment before requesting another sign-in link.');
                } else if (error.status === 422) {
                    setFeedback('Invalid email address. Please check and try again.');
                } else {
                    setFeedback(`Failed to send sign-in link: ${error.message || 'Please try again.'}`);
                }
            } else {
                setFeedback(`A sign-in link has been sent to ${values.email.trim()}. Please check your inbox and spam folder.`);
                setLinkMode(false);
            }
        } catch (err: any) {
            logger.error('Unexpected magic link error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
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
                <View style={styles.feedbackContainer}>
                    <Text variant="body2" style={styles.feedbackText}>
                        {feedback}
                    </Text>
                </View>
            )}

            <View style={styles.infoBox}>
                <Text variant="body2" color="secondary">
                    Sign in to access your saved events and personalized recommendations.
                </Text>
            </View>

            <Controller
                control={control}
                rules={{
                    required: 'Email is required',
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                    },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Email"
                        placeholder="email@address.com"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize='none'
                        error={errors.email?.message}
                    />
                )}
                name="email"
            />

            {!forgotMode && (
                <>
                    <Controller
                        control={control}
                        rules={{
                            required: 'Password is required',
                        }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                autoCapitalize='none'
                                showPasswordToggle
                                error={errors.password?.message}
                            />
                        )}
                        name="password"
                    />
                    <TouchableOpacity onPress={() => setForgotMode(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                        <Text variant="body2" style={styles.linkText}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                </>
            )}

            {!forgotMode && !linkMode && !needsConfirmation && (
                <View style={styles.buttonContainer}>
                    <Button 
                        title="Sign In" 
                        disabled={loading} 
                        onPress={handleSubmit(signInWithEmail)}
                        fullWidth
                        loading={loading}
                    />

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text variant="body2" color="secondary" style={styles.dividerText}>
                            or
                        </Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <Button 
                        title="Continue with Google" 
                        variant="outline" 
                        onPress={signInWithGoogle}
                        fullWidth
                    />
                </View>
            )}

            {needsConfirmation && (
                <View style={styles.buttonContainer}>
                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary">
                            Your email needs to be verified before you can sign in. Click below to receive a new confirmation email.
                        </Text>
                    </View>
                    <Button 
                        title="Resend Confirmation Email" 
                        variant="primary" 
                        onPress={handleSubmit(resendConfirmationEmail)}
                        fullWidth
                        loading={loading}
                    />
                    <Button
                        title="Back to Sign In"
                        variant="outline"
                        onPress={() => {
                            setNeedsConfirmation(false);
                            setFeedback(null);
                        }}
                        fullWidth
                    />
                </View>
            )}

            {forgotMode && (
                <View style={styles.forgotPasswordSection}>
                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary">
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                    </View>
                    <Button
                        title="Send Reset Link"
                        variant="primary"
                        onPress={handleSubmit(sendPasswordReset)}
                        fullWidth
                        loading={loading}
                    />
                    <Button
                        title="Back to Sign In"
                        variant="outline"
                        onPress={() => setForgotMode(false)}
                        fullWidth
                    />
                </View>
            )}

            {linkMode && (
                <View style={styles.forgotPasswordSection}>
                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary">
                            It looks like a Google account already exists with this email. Enter that email below to receive a sign-in link and then link your Google account from your profile.
                        </Text>
                    </View>
                    <Button 
                        title="Send Sign-In Link" 
                        variant="primary" 
                        onPress={handleSubmit(sendMagicLinkForLinking)} 
                        fullWidth
                        loading={loading} 
                    />
                    <Button
                        title="Back to Sign In"
                        variant="outline"
                        onPress={() => setLinkMode(false)}
                        fullWidth
                    />
                </View>
            )}

            <View style={styles.guestContainer}>
                <View style={styles.linkContainer}>
                    <Text variant="body2" color="secondary">
                        Don't have an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/user/signup')}>
                        <Text variant="body2" style={styles.linkText}>
                            Sign Up
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <View style={[styles.linkContainer, { marginTop: 8, justifyContent: 'center' }]}>
                    <Text variant="body2" color="secondary">
                        Don't want to make an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/')}>
                        <Text variant="body2" style={styles.linkText}>
                            Continue as Guest
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.legalLinksContainer}>
                <TouchableOpacity onPress={() => router.push('/terms')}>
                    <Text variant="body2" style={styles.legalLink}>
                        Terms of Service
                    </Text>
                </TouchableOpacity>
                <Text variant="body2" color="secondary">•</Text>
                <TouchableOpacity onPress={() => router.push('/privacy')}>
                    <Text variant="body2" style={styles.legalLink}>
                        Privacy Policy
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}