import {StyleSheet, View} from 'react-native'
import { Text} from "../../components/ui";

import {useAuth} from "../../hooks/useAuth";
import PageView from "../../components/ui/PageView";
import SignOutButton from "../../components/user/SignOutButton";

export default function ProfileRoute() {
    const { profile } = useAuth()
    return (
        <PageView title="Profile &amp; Settings">
            <View style={styles.titleContainer}>
                <Text>Welcome!</Text>
            </View>
            <View style={styles.stepContainer}>
                <Text>{profile?.username}</Text>
                <Text>{profile?.full_name}</Text>
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