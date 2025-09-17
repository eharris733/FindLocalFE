import {View} from "react-native";
import TopNavigation from "./TopNavigation";
import React from "react";
import {useRouter} from "expo-router";

export default function Header() {
    const router = useRouter();

    const handleNavLinkPress = (link: string) => {
        router.navigate(`/${link.toLowerCase()}`);
    };

    return (<View><TopNavigation onNavLinkPress={handleNavLinkPress} />
    </View>)
}