import {View} from "react-native";
import {Text} from "../components/ui";
import { useTheme } from '../context/ThemeContext';

export default function FriendsRoute() {
    const { theme } = useTheme();
    
    return (
        <View style={{ 
            flex: 1, 
            backgroundColor: theme.colors.background.primary,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl
        }}>
            <View style={{
                backgroundColor: theme.colors.primary[500],
                paddingVertical: theme.spacing.xl,
                paddingHorizontal: theme.spacing['2xl'],
                borderRadius: theme.borderRadius.xl,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: theme.colors.gray[900],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                minWidth: '80%',
            }}>
                <Text 
                    variant="h1" 
                    color="inverse"
                    style={{ 
                        marginBottom: theme.spacing.md,
                        textAlign: 'center'
                    }}
                >
                    Coming Soon!
                </Text>
                <Text 
                    variant="h4" 
                    color="inverse"
                    style={{ 
                        marginBottom: theme.spacing.lg,
                        textAlign: 'center',
                        opacity: 0.9
                    }}
                >
                    Friends Feature
                </Text>
                <View style={{
                    width: 60,
                    height: 4,
                    backgroundColor: theme.colors.secondary[300],
                    borderRadius: theme.borderRadius.full,
                    marginBottom: theme.spacing.lg
                }} />
                <Text 
                    variant="body1" 
                    color="inverse"
                    style={{ 
                        textAlign: 'center',
                        lineHeight: 24,
                        opacity: 0.8,
                        maxWidth: 300
                    }}
                >
                    Connect with friends, share events, and discover what your community is up to. 
                    This feature is in development and will be available soon!
                </Text>
            </View>
            <View style={{
                position: 'absolute',
                top: theme.spacing['3xl'],
                left: theme.spacing.xl,
                width: 20,
                height: 20,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.accent[300],
                opacity: 0.3
            }} />
            <View style={{
                position: 'absolute',
                bottom: theme.spacing['3xl'],
                right: theme.spacing.xl,
                width: 30,
                height: 30,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.secondary[200],
                opacity: 0.2
            }} />
            <View style={{
                position: 'absolute',
                top: '30%',
                right: theme.spacing.lg,
                width: 15,
                height: 15,
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary[300],
                opacity: 0.4
            }} />
        </View>
    );
}