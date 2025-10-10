import {Image, StyleSheet} from "react-native";
import React from "react";

type LogoProps = {
    isMobile?:boolean;
    isMenu?:boolean;
}

export const Logo = ({isMobile = false, isMenu = false}: LogoProps) => <Image
    source={require('../../../assets/logo.png')}
    style={[
        styles.logo,
        isMobile && styles.logoMobile,
        isMenu && styles.menuLogo,
    ]}
    resizeMode="contain"
/>

const styles = StyleSheet.create({
    logo: {
        height: 80,
        width: 320,
    },
    logoMobile: {
        height: 50,
        width: 180,
    },
    menuLogo: {
        height: 30,
        width: 32,
    },
});