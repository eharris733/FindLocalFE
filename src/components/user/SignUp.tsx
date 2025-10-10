import {Controller, useForm} from "react-hook-form";
import {View, Alert, Platform, ActivityIndicator, StyleSheet, TouchableOpacity} from "react-native";
import {Button, Text} from "../ui";
import {supabase} from "../../supabase";
import React, {useState} from "react";
import Input from "../ui/Input";
import {useRouter} from "expo-router";
import * as Linking from "expo-linking";
import { useTheme } from "../../context/ThemeContext";

type LoginFormValues = {
    email: string;
    password: string;
}

export default function SignUp() {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [showResend, setShowResend] = useState(false);
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: "",
            password: "",
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
    });

    async function checkEmailExists(email: string): Promise<boolean> {
        try {
            // Call the Supabase function to check if email exists
            const { data, error } = await supabase.rpc('check_email_exists', { 
                email_to_check: email.trim().toLowerCase() 
            });
            
            if (error) {
                console.error('Error checking email:', error);
                return false; // Fail open - allow signup attempt
            }
            
            return data === true;
        } catch (err) {
            console.error('Error in checkEmailExists:', err);
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

            const redirectTo = Platform.OS === 'web' 
                ? `${window.location.origin}/auth/callback`
                : Linking.createURL('/auth/callback');

            const {
                data: { session },
                error,
            } = await supabase.auth.signUp({
                email: values.email.trim(),
                password: values.password,
                options: {
                    emailRedirectTo: redirectTo,
                }
            });
            
            if (error) {
                setFeedback(error.message);
                setShowResend(false);
            } else if (!session) {
                setFeedback('Success! Please check your inbox (and spam folder) for a verification email.');
                setShowResend(true);
            } else {
                // Auto-logged in (if email confirmation is disabled in Supabase)
                setFeedback('Account created successfully!');
                setShowResend(false);
                setTimeout(() => router.replace('/'), 1500);
            }
        } catch (err: any) {
            setFeedback(`Sign up failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    async function signUpWithGoogle() {
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
                setFeedback(`Google sign-up failed: ${error.message}`);
            }

            if (data?.url && Platform.OS !== 'web') {
                const supported = await Linking.canOpenURL(data.url);
                if (supported) {
                    await Linking.openURL(data.url);
                } else {
                    console.warn('Cannot open URL from Supabase OAuth', data.url);
                }
            }
        } catch (err: any) {
            setFeedback(`Google sign-up failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    async function resendConfirmationEmail(values: LoginFormValues) {
        try {
            setLoading(true);
            const redirectTo = Platform.OS === 'web' 
                ? `${window.location.origin}/auth/callback`
                : Linking.createURL('/auth/callback');
            const { error } = await (supabase.auth as any).resend({
                type: 'signup',
                email: values.email.trim(),
                options: { emailRedirectTo: redirectTo },
            });
            if (error) {
                setFeedback(`Resend failed - ${error.message}`);
                return;
            }
            setFeedback('Confirmation email resent. Please check your inbox (and spam).');
        } catch (e: any) {
            setFeedback(`Failed to resend confirmation email - ${e?.message || 'Unknown error'}`);
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
                <View style={showResend ? styles.successContainer : styles.feedbackContainer}>
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
                        secureTextEntry
                        error={errors.password?.message}
                    />
                )}
                name="password"
            />

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

                <Button 
                    title="Continue with Google" 
                    variant="outline" 
                    onPress={signUpWithGoogle}
                    fullWidth
                />
                
                {showResend && (
                    <Button 
                        title="Resend Confirmation Email" 
                        variant="outline" 
                        onPress={handleSubmit(resendConfirmationEmail)}
                        fullWidth
                    />
                )}
            </View>

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

            <View style={styles.guestContainer}>
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                </View>
                <Button 
                    title="Continue as Guest" 
                    variant="ghost" 
                    onPress={() => router.push('/')}
                    fullWidth
                />
            </View>
        </View>
    )
}