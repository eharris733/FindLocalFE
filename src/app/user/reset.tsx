import React from "react";
import ResetPassword from "../../components/user/ResetPassword";
import PageView from "../../components/ui/PageView";

export default function ResetRoute() {
    return (
        <>
            <PageView title="Reset Password">
                <ResetPassword />
            </PageView>
        </>
    )
}