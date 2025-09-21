import { Controller, useForm} from "react-hook-form";
import {View, Platform, ActivityIndicator} from "react-native";
import {Button, Text} from "../ui";
import {supabase} from "../../supabase";
import React, {useState} from "react";
import Input from "../ui/Input";
import {Link} from "expo-router";
import * as Linking from "expo-linking";
import {styles} from "./styles";

type LoginFormValues = {
    email: string;
    password: string;
    resetEmail?: string;
    linkEmail?: string;
}

export default function SignIn() {
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
        <>
            {loading && (
                <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" />
                </View>
            )}
            {feedback && <Text variant="body2" color="info">{feedback}</Text>}
            <Controller
                control={control}
                rules={{
                    required: true,
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Email"
                        placeholder="Email"
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
                    maxLength: 100,
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                        label="Password"
                        placeholder="Password"
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

            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button title="Sign in" disabled={loading} onPress={handleSubmit(signInWithEmail)} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Continue with Google" variant="outline" onPress={() => signInWithGoogle()} />
            </View>
            <View style={styles.verticallySpaced}>
                <Link href='/user/signup'>Need to Register?</Link>
            </View>

            {forgotMode && (
                <View style={[styles.verticallySpaced, styles.mt20]}>
                    <Controller
                        control={control}
                        render={({field: {onChange, onBlur, value}}) => (
                            <Input
                                label="Email for reset"
                                value={email || value}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                placeholder="email@address.com"
                                autoCapitalize='none'
                            />
                        )}
                        name="resetEmail"
                    />
                    <View style={[styles.verticallySpaced, styles.mt20]}>
                        <Button
                            title="Send reset link"
                            variant="primary"
                            onPress={handleSubmit(sendPasswordReset)}
                        />
                    </View>
                </View>)
            }

            {linkMode && (
                <View style={styles.verticallySpaced}>
                    <Text variant="body2">It looks like a Google account already exists with this email. Enter that email below to receive a sign-in link and then link your Google account from your profile.</Text>
                    <Controller
                        control={control}
                        render={({field: {onChange, onBlur, value}}) => (
                            <Input
                                label="Email associated with Google"
                                value={email || value}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                placeholder="email@address.com"
                                autoCapitalize='none'
                            />
                        )}
                        name="linkEmail"
                    />
                    <View style={[styles.verticallySpaced, styles.mt20]}>
                        <Button title="Send sign-in link" variant="primary" onPress={handleSubmit(sendMagicLinkForLinking)} loading={loading} />
                    </View>
                </View>)
            }
        </>
    )
}