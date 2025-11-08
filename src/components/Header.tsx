import {View} from "react-native";
import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";

interface HeaderProps {
    readonly onFeedbackPress?: () => void;
}

export default function Header({ onFeedbackPress }: HeaderProps = {}) {
    const router = useRouter();

    const handleNavLinkPress = (link: string) => {
        router.navigate(`/${link.toLowerCase()}`);
    };

    return (<View><TopNavigation onNavLinkPress={handleNavLinkPress} onFeedbackPress={onFeedbackPress} />
    </View>)
}