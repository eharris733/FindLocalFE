import * as React from 'react';
import { supabase } from "../../supabase";
import { Button } from '../ui';

async function onSignOutButtonPress() {
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error('Error signing out:', error)
    }
}

export default function SignOutButton() {
    return (
        <Button 
            title="Sign Out" 
            variant="secondary"
            onPress={onSignOutButtonPress} 
        />
    )
}
