import {createContext, PropsWithChildren, useEffect, useState} from "react";
import {Session} from "@supabase/supabase-js";
import {supabase} from "../supabase";
import {AuthData} from "../hooks/useAuth";
import { logger } from "../utils/logger";
import { Platform } from "react-native";
import { router } from "expo-router";

export const AuthContext = createContext<AuthData>({
    session: undefined,
    profile: undefined,
    isLoading: true,
    isLoggedIn: false,
});

export default function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | undefined | null>()
    const [profile, setProfile] = useState<any>()
    const [isLoading, setIsLoading] = useState<boolean>(true)
    // Fetch the session once, and subscribe to auth state changes
    useEffect(() => {
        const fetchSession = async () => {
            setIsLoading(true)
            const {
                data: { session },
                error,
            } = await supabase.auth.getSession()
            if (error) {
                logger.error('Error fetching session:', error)
            }
            setSession(session)
            setIsLoading(false)
        }
        fetchSession()
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            logger.debug('Auth state changed:', { event, session })
            
            // Handle password recovery redirect on web
            if (Platform.OS === 'web' && event === 'PASSWORD_RECOVERY') {
                logger.info('Password recovery detected, redirecting to /user/reset');
                // Check if we're not already on the reset page to avoid redirect loops
                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    if (!currentPath.endsWith('/user/reset')) {
                        // Use router.replace to navigate within the app
                        const hash = window.location.hash;
                        logger.info('Redirecting with hash:', hash);
                        // Use setTimeout to ensure the session is fully established first
                        setTimeout(() => {
                            router.replace('/user/reset');
                        }, 100);
                    }
                }
            }
            
            setSession(session)
        })
        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe()
        }
    }, [])
    // Fetch the profile when the session changes
    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true)
            if (session) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                setProfile(data)
            } else {
                setProfile(null)
            }
            setIsLoading(false)
        }
        fetchProfile()
    }, [session])
    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading,
                profile,
                isLoggedIn: session != undefined,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}