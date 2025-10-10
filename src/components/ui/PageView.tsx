import React, {PropsWithChildren} from "react";
import {StyleSheet, View, ScrollView} from "react-native";
import {Text} from "./Text";
import { useTheme } from "../../context/ThemeContext";

type PageViewProps = PropsWithChildren & {
    title?: string;
}
export default function PageView({children, title}: PageViewProps ) {
    const { theme } = useTheme();
    
    return (
        <ScrollView 
            style={[styles.scrollView, { backgroundColor: theme.colors.background.primary }]}
            contentContainerStyle={styles.contentContainer}
        >
            <View style={styles.container}>
                {title && <Text variant="h3" style={{ marginBottom: 20 }}>{title}</Text>}
                {children}
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        flexDirection: 'column',
        padding: 20,
    },
})