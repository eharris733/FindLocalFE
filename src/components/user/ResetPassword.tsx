import React, {useState} from "react";
import {Controller, useForm} from "react-hook-form";
import {supabase} from "../../supabase";
import {Button, Text} from "../ui";
import {ActivityIndicator, View} from "react-native";
import {styles} from "./styles";
import Input from "../ui/Input";
import {Link} from "expo-router";

type RestFormValues = {
    newPassword: string;
    confirmPassword: string;
}

export default function ResetPassword() {
    const [loading, setLoading] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<string | null>(null);
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

    async function passwordReset(values: RestFormValues) {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.updateUser({ password: values.newPassword });
            if (error) {
                setFeedback(error.message);
                return;
            }
            setFeedback('Password updated. You can now sign in.');
        } catch (e: any) {
            setFeedback(e?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    }

    return (<>
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
                minLength: 8,
            }}
            render={({ field: { onChange, onBlur, value } }) => (
                <Input
                    label="New password"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="Enter new password"
                    autoCapitalize='none'
                />)}
            name="newPassword"
        />

        <Controller
            control={control}
            rules={{
                required: true,
                validate: (value: string) => value === password || 'Passwords do not match',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
                <Input
                    label="Confirm password"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="Enter new password"
                    autoCapitalize={'none'}
                    error={errors.confirmPassword?.message}
                />)}
            name="confirmPassword"
        />
        <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button title="Update password" variant="primary" onPress={handleSubmit(passwordReset)} />
        </View>
        <Link href="/user/signin">Back to sign in</Link>
    </>)
}