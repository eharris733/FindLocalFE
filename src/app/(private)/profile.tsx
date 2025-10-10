import {StyleSheet, View} from 'react-native'
import { Text} from "../../components/ui";

import {useAuth} from "../../hooks/useAuth";
import PageView from "../../components/ui/PageView";
import SignOutButton from "../../components/user/SignOutButton";
import React, {useState} from "react";
import {Link} from "expo-router";

export default function ProfileRoute() {
    const { isLoggedIn, profile } = useAuth();

    return (
        <PageView title="Profile &amp; Settings">
            {!isLoggedIn && <Text variant="body2" color="info">
              You are logged out. <Link href="/">Return to home</Link>.
            </Text>}
            <View style={styles.titleContainer}>
                <Text>Welcome!</Text>
            </View>
            <View style={styles.stepContainer}>
                <Text>{profile?.email}</Text>
            </View>
            <SignOutButton />
        </PageView>
    )
}
const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
})