import {Controller, useForm} from "react-hook-form";
import {View, Alert, Platform, ActivityIndicator} from "react-native";
import {Button, Text} from "../ui";
import {supabase} from "../../supabase";
import React, {useState} from "react";
import Input from "../ui/Input";
import {Link} from "expo-router";
import {styles} from "./styles";
import * as Linking from "expo-linking";

type LoginFormValues = {
    email: string;
    password: string;
}

export default function SignUp() {
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function signUpWithEmail(values: LoginFormValues) {
        setLoading(true);
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
        })
        console.log(session);
        if (error) Alert.alert(error.message)
        if (!session) Alert.alert('Please check your inbox for email verification!')
        setLoading(false);
    }

    async function resendConfirmationEmail(values: LoginFormValues) {
        try {
            setLoading(true);
            const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
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
                        error={errors.email ? 'Email is required.' : undefined}
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
                        error={errors.password ? 'Password is required.' : undefined}
                    />
                )}
                name="password"
            />

            <View style={styles.verticallySpaced}>
                <Button title="Sign up" disabled={loading} onPress={handleSubmit(signUpWithEmail)} />
            </View>
            <View style={styles.verticallySpaced}>
                <Button title="Resend confirmation email" variant="outline" onPress={handleSubmit(resendConfirmationEmail)} />
            </View>
        </>
    )
}