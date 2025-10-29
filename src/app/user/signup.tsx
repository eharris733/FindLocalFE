import {Text} from "../../components/ui";
import {View, StyleSheet} from "react-native";
import {theme} from "../../theme";
import SignUp from "../../components/user/SignUp";
import PageView from "../../components/ui/PageView";

export default function SignUpRoute() {
    return (
        <PageView title="Sign Up">
            <SignUp />
        </PageView>
    )
}