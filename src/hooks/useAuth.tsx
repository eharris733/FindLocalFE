import { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import {AuthContext} from "../providers/auth-provider";

export type AuthData = {
    session?: Session | null
    profile?: any | null
    isLoading: boolean
    isLoggedIn: boolean
    refreshProfile?: () => Promise<void>
}


export const useAuth = () => useContext(AuthContext)