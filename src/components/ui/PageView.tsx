import React, {PropsWithChildren} from "react";
import {StyleSheet, View} from "react-native";
import {Text} from "./Text";

type PageViewProps = PropsWithChildren & {
    title?: string;
}
export default function PageView({children, title}: PageViewProps ) {
    return (
        <View style={styles.container}>
            <Text variant="h3">{title}</Text>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
    },
})