import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";

interface HeaderProps {
    readonly onFeedbackPress?: () => void;
}

export default function Header({ onFeedbackPress }: HeaderProps = {}) {
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

    return <TopNavigation onNavLinkPress={handleNavLinkPress} onFeedbackPress={onFeedbackPress} />;
}
