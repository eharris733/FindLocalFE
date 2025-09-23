import * as React from 'react';
import { Button } from 'react-native';
import {supabase} from "../../supabase";

async function onSignOutButtonPress() {
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error('Error signing out:', error)
    }
}

export default function SignOutButton() {
    return <Button title="Sign out" onPress={onSignOutButtonPress} />
}
