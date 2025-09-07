import {Dimensions} from "react-native";
import {useEffect, useState} from "react";
import {MOBILE_MAX, TABLET_MAX} from "../constants";

type UseDeviceInfo = {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    screenWidth: number;
}

export const useDeviceInfo = () : UseDeviceInfo => {
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

    const isMobile = screenWidth < MOBILE_MAX;
    const isTablet = screenWidth >= MOBILE_MAX && screenWidth < TABLET_MAX;
    const isDesktop = screenWidth >= TABLET_MAX;

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

    return {
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
    }
}