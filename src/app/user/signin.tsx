import SignIn from "../../components/user/SignIn";
import React from "react";
import PageView from "../../components/ui/PageView";
import {Text} from "../../components/ui";
import {Link} from "expo-router";
import {View} from "react-native";

export default function SignInRoute() {
    return (
        <PageView title="Sign In">
            <Text variant="body2">
                Sign into your account here.
            </Text>
            <Text variant="link">
                <Link href='/user/signup'>If you don't have an account, register here</Link>
            </Text>
            <View style={styles.container}>
                <SignIn />
            </View>
        </PageView>
    )
}

const styles = {
    container: {
        marginTop: 16,
    },
}