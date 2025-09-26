import SignUp from "../../components/user/SignUp";
import PageView from "../../components/ui/PageView";
import {Text} from "../../components/ui";
import {Link} from "expo-router";
import React from "react";

export default function SignUpRoute() {
    return (
        <PageView title="Sign Up">
            <Text variant="body2">
                Sign up for a new account here.
            </Text>
            <Text variant="link">
                <Link href='/user/signin'>Already have one? Sign in here.</Link>
            </Text>
            <SignUp />
        </PageView>
    )
}