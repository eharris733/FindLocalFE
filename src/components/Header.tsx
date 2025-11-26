import {View} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
    readonly onFeedbackPress?: () => void;
}

export default function Header({ onFeedbackPress }: HeaderProps = {}) {
    const router = useRouter();
    const { theme } = useTheme();

    const handleNavLinkPress = (link: string) => {
        // Map 'Events' to home page, others to their respective routes
        if (link.toLowerCase() === 'events') {
            router.navigate('/');
        } else {
            router.navigate(`/${link.toLowerCase()}`);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background.primary }}>
            <TopNavigation onNavLinkPress={handleNavLinkPress} onFeedbackPress={onFeedbackPress} />
        </SafeAreaView>
    );
}