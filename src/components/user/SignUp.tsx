import {Controller, useForm} from "react-hook-form";
import {View, Platform, ActivityIndicator, StyleSheet, TouchableOpacity} from "react-native";
import {Button, Text} from "../ui";
import {supabase, getAuthRedirectUrl} from "../../supabase";
import React, {useState, useEffect} from "react";
import Input from "../ui/Input";
import {useRouter} from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { logger } from "../../utils/logger";
import AppleSignInButton from "./AppleSignInButton";
import GoogleSignInButton from "./GoogleSignInButton";

type LoginFormValues = {
    email: string;
    password: string;
    agreedToTerms: boolean;
    marketingOptIn: boolean;
}

export default function SignUp() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [showResend, setShowResend] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(60);
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: "",
            password: "",
            agreedToTerms: false,
            marketingOptIn: false,
        },
    });

    const email = watch('email');

    // Countdown timer effect for resend button
    useEffect(() => {
        if (showResend && !canResend && resendCountdown > 0) {
            const timer = setTimeout(() => {
                setResendCountdown(resendCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (resendCountdown === 0) {
            setCanResend(true);
        }
    }, [showResend, canResend, resendCountdown]);

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
        checkboxContainer: {
            gap: 12,
            marginTop: 8,
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
            borderColor: theme.colors.border.medium,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 2,
        },
        checkboxChecked: {
            backgroundColor: theme.colors.primary[500],
            borderColor: theme.colors.primary[500],
        },
        checkboxInner: {
            width: 12,
            height: 12,
            backgroundColor: 'white',
        },
        checkboxLabel: {
            flex: 1,
            lineHeight: 20,
        },
        checkboxError: {
            color: theme.colors.error,
            fontSize: 12,
            marginTop: 4,
            marginLeft: 32,
        },
        emailSentContainer: {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
        },
        successIconContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.success + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
        },
        successIcon: {
            fontSize: 48,
            color: theme.colors.success,
        },
    });

    async function checkEmailExists(email: string): Promise<boolean> {
        try {
            // Call the Supabase function to check if email exists
            const { data, error } = await supabase.rpc('check_email_exists', { 
                email_to_check: email.trim().toLowerCase() 
            });
            
            if (error) {
                logger.error('Error checking email:', error);
                return false; // Fail open - allow signup attempt
            }
            
            return data === true;
        } catch (err) {
            logger.error('Error in checkEmailExists:', err);
            return false; // Fail open - allow signup attempt
        }
    }

    async function signUpWithEmail(values: LoginFormValues) {
        setLoading(true);
        try {
            // First, check if email already exists
            const emailExists = await checkEmailExists(values.email);
            
            if (emailExists) {
                setFeedback('An account with this email already exists. Please sign in instead.');
                setShowResend(false);
                setLoading(false);
                return;
            }

            const redirectTo = getAuthRedirectUrl('/auth/callback');

            const {
                data: { session },
                error,
            } = await supabase.auth.signUp({
                email: values.email.trim(),
                password: values.password,
                options: {
                    emailRedirectTo: redirectTo,
                    data: {
                        marketing_opt_in: values.marketingOptIn,
                        agreed_to_terms: values.agreedToTerms,
                        // Note: agreed_to_terms_date is set server-side in database trigger
                        // for legal compliance (cannot be manipulated by client)
                    }
                }
            });
            
            if (error) {
                // Handle sign-up specific errors
                if (error.status === 422) {
                    // Validation error - weak password, invalid email format, etc.
                    setFeedback(`Sign up failed: ${error.message || 'Please check your email and password.'}`);
                } else if (error.status === 429) {
                    setFeedback('Too many sign-up attempts. Please wait a moment and try again.');
                } else {
                    setFeedback(error.message || 'Sign up failed. Please try again.');
                }
                setShowResend(false);
            } else if (!session) {
                // Email confirmation required - show success screen
                setFeedback(null);
                setShowResend(true);
                setCanResend(false);
                setResendCountdown(60);
            } else {
                setFeedback('Account created successfully!');
                setShowResend(false);
                setTimeout(() => router.replace('/'), 1500);
            }
        } catch (err: any) {
            logger.error('Unexpected sign up error:', err);
            setFeedback('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }



    async function resendConfirmationEmail(values: LoginFormValues) {
        setLoading(true);
        setCanResend(false);
        setResendCountdown(60);
        try {
            const redirectTo = getAuthRedirectUrl('/auth/callback');
            const { error } = await (supabase.auth as any).resend({
                type: 'signup',
                email: values.email.trim(),
                options: { emailRedirectTo: redirectTo },
            });
            
            if (error) {
                // Handle resend errors
                if (error.status === 429) {
                    setFeedback('Too many requests. Please wait a moment before requesting another confirmation email.');
                } else if (error.status === 422) {
                    setFeedback('Invalid email address. Please check and try again.');
                } else {
                    setFeedback(`Failed to resend: ${error.message || 'Please try again.'}`);
                }
                return;
            }
            setFeedback(null);
        } catch (e: any) {
            logger.error('Unexpected resend error:', e);
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
            
            {showResend ? (
                // Email sent success screen
                <View style={styles.emailSentContainer}>
                    <View style={styles.successIconContainer}>
                        <Text style={styles.successIcon}>✓</Text>
                    </View>
                    <Text variant="h3" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
                        Email Successfully Sent!
                    </Text>
                    <Text variant="body1" style={{ marginBottom: theme.spacing.lg, textAlign: 'center', lineHeight: 22 }}>
                        Please check your inbox at{' '}
                        <Text style={{ fontWeight: '600' }}>{email}</Text>
                        {' '}for a verification email.
                    </Text>
                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary" style={{ textAlign: 'center' }}>
                            Don't see it? Check your spam or other folders. The link will expire in 24 hours.
                        </Text>
                    </View>
                    
                    {feedback && (
                        <View style={styles.feedbackContainer}>
                            <Text variant="body2" style={styles.feedbackText}>
                                {feedback}
                            </Text>
                        </View>
                    )}
                    
                    <View style={{ marginTop: theme.spacing.xl, gap: 12, width: '100%' }}>
                        <Button
                            title={canResend ? "Resend Verification Email" : `Resend in ${resendCountdown}s`}
                            variant="outline"
                            onPress={handleSubmit(resendConfirmationEmail)}
                            disabled={!canResend || loading}
                            loading={loading}
                            fullWidth
                        />
                        <Button
                            title="Back to Sign In"
                            variant="secondary"
                            onPress={() => router.push('/user/signin')}
                            fullWidth
                        />
                    </View>
                </View>
            ) : (
                <>
                    {feedback && (
                        <View style={styles.feedbackContainer}>
                            <Text variant="body2" style={styles.feedbackText}>
                                {feedback}
                            </Text>
                        </View>
                    )}

                    <View style={styles.infoBox}>
                        <Text variant="body2" color="secondary">
                            Create an account to save your favorite events and get personalized recommendations.
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
                        label="Password"
                        placeholder="Create a password (min. 6 characters)"
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

            <View style={styles.checkboxContainer}>
                <Controller
                    control={control}
                    rules={{
                        required: 'You must agree to the Terms of Service to create an account',
                    }}
                    render={({ field: { onChange, value } }) => (
                        <View>
                            <TouchableOpacity 
                                style={styles.checkboxRow}
                                onPress={() => onChange(!value)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                                    {value && <View style={styles.checkboxInner} />}
                                </View>
                                <Text variant="body2" style={styles.checkboxLabel}>
                                    I agree to the{' '}
                                    <Text 
                                        style={styles.legalLink}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (Platform.OS === 'web') {
                                                window.open('/terms', '_blank');
                                            } else {
                                                router.push('/terms');
                                            }
                                        }}
                                    >
                                        Terms of Service
                                    </Text>
                                    {' '}and{' '}
                                    <Text 
                                        style={styles.legalLink}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            if (Platform.OS === 'web') {
                                                window.open('/privacy', '_blank');
                                            } else {
                                                router.push('/privacy');
                                            }
                                        }}
                                    >
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </TouchableOpacity>
                            {errors.agreedToTerms && (
                                <Text style={styles.checkboxError}>
                                    {errors.agreedToTerms.message}
                                </Text>
                            )}
                        </View>
                    )}
                    name="agreedToTerms"
                />

                <Controller
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <TouchableOpacity 
                            style={styles.checkboxRow}
                            onPress={() => onChange(!value)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                                {value && <View style={styles.checkboxInner} />}
                            </View>
                            <Text variant="body2" style={styles.checkboxLabel}>
                                Send me personalized event recommendations and FindLocal updates (optional)
                            </Text>
                        </TouchableOpacity>
                    )}
                    name="marketingOptIn"
                />
            </View>

            <View style={styles.buttonContainer}>
                <Button 
                    title="Create Account" 
                    disabled={loading} 
                    onPress={handleSubmit(signUpWithEmail)}
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

                <GoogleSignInButton
                    onSuccess={() => router.replace('/')}
                    onError={setFeedback}
                    setLoading={setLoading}
                />

                <AppleSignInButton
                    onSuccess={() => router.replace('/')}
                    onError={setFeedback}
                    setLoading={setLoading}
                />
            </View>

            <View style={styles.guestContainer}>
                <View style={styles.linkContainer}>
                    <Text variant="body2" color="secondary">
                        Already have an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/user/signin')}>
                        <Text variant="body2" style={styles.linkText}>
                            Sign In
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
                </>
            )}
        </View>
    )
}