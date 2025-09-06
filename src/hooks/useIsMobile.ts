import {Dimensions} from "react-native";
import {useEffect, useState} from "react";
import {MOBILE_MIN} from "../constants";

export const useIsMobile = () => {
    const [screen, setScreen] = useState(Dimensions.get('window').width);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreen(window.width);
        });
        return () => subscription?.remove();
    }, []);


    return {
        isMobile: screen < MOBILE_MIN,
        screenWidth: screen,
    }
}