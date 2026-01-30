import React, {PropsWithChildren} from "react";
import {StyleSheet, View, ScrollView} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Text} from "./Text";
import { useTheme } from "../../context/ThemeContext";

type PageViewProps = PropsWithChildren & {
    title?: string;
}
export default function PageView({children, title}: PageViewProps ) {
    const { theme } = useTheme();

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}
            edges={['top', 'left', 'right']}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.container}>
                    {title && <Text variant="h3" style={{ marginBottom: 20 }}>{title}</Text>}
                    {children}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
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