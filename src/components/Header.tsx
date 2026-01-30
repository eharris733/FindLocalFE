import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";

interface HeaderProps {
    readonly onFeedbackPress?: () => void;
}

export default function Header({ onFeedbackPress }: HeaderProps = {}) {
    const router = useRouter();

    const handleNavLinkPress = (link: string) => {
        // Map 'Events' to home page, others to their respective routes
        if (link.toLowerCase() === 'events') {
            router.navigate('/');
        } else {
            router.navigate(`/${link.toLowerCase()}`);
        }
    };

    return <TopNavigation onNavLinkPress={handleNavLinkPress} onFeedbackPress={onFeedbackPress} />;
}
