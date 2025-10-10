
import { SplashScreen } from 'expo-router'
import {useAuth} from "../hooks/useAuth";
SplashScreen.preventAutoHideAsync()

export function SplashScreenController() {
    const { isLoading } = useAuth()
    if (!isLoading) {
        SplashScreen.hideAsync()
    }
    return null
}
