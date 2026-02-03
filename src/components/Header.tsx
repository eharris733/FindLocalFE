import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";

export default function Header() {
    const router = useRouter();

    const handleNavLinkPress = (link: string) => {
        // Empty string = logo click, go to home
        if (link === '') {
            router.navigate('/home');
        } else if (link.toLowerCase() === 'events') {
            // Events goes to discover page
            router.navigate('/');
        } else {
            router.navigate(`/${link.toLowerCase()}`);
        }
    };

    return <TopNavigation onNavLinkPress={handleNavLinkPress} />;
}
