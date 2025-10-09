import { Controller, useForm} from "react-hook-form";
import {View, Platform, ActivityIndicator, StyleSheet, TouchableOpacity} from "react-native";
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
    });

    async function signInWithEmail(values: LoginFormValues) {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });
            if (error) setFeedback(error.message);
        } catch (err: any) {
            setFeedback(`Reset failed ${err?.message || 'Unknown error'}`);
        }
        setLoading(false);
    }

    async function signInWithGoogle() {
        setLoading(true);
        try {
            const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
            });

            if (error) {
                const msg = (error.message || '').toLowerCase();
                if (msg.includes('already')
                    || msg.includes('duplicate')
                    || msg.includes('account exists')
                ) {
                    setLinkMode(true);
                }
                setFeedback(`Google sign-in failed ${error.message}`);
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
            setFeedback(`Google sign-in failed ${err?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    async function sendPasswordReset(values: LoginFormValues) {
        setLoading(true);
        const targetEmail = (values.resetEmail || email).trim();
        try {
            const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
            const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
            setFeedback(
                error
                    ? `Reset failed: ${error.message}`
                    : `If you have an account, a reset email will be sent to ${targetEmail}`
            );
            setForgotMode(false);
        } catch (err: any) {
            setFeedback(`Reset failed ${err?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }

    async function sendMagicLinkForLinking(values: LoginFormValues) {
        try {
            setLoading(true);
            const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
            const { data, error } = await supabase.auth.signInWithOtp({ email: values.email.trim(), options: { emailRedirectTo: redirectTo } });
            setFeedback(error
                ? `Failed to send sign-in link - ${error.message}`
            : `A sign-in link has been sent to ${values.email.trim()}. Use it to link your Google account.`);
            setLinkMode(false);
        } catch (err: any) {
            setFeedback(`Failed to send link - ${err?.message || 'Unknown error'}`);
        }
        setLoading(false);
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
                            secureTextEntry
                            error={errors.password?.message}
                        />
                    )}
                    name="password"
                />
            )}

            {!forgotMode && !linkMode && (
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

                    <TouchableOpacity onPress={() => setForgotMode(true)}>
                        <Text variant="body2" style={[styles.linkText, { textAlign: 'center', marginTop: 8 }]}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

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