import SignIn from "../../components/user/SignIn";
import React from "react";
import PageView from "../../components/ui/PageView";

export default function SignInRoute() {
    return (
        <PageView title="Sign In">
            <SignIn />
        </PageView>
    )
}