import { Session } from '@supabase/supabase-js'
import { useContext } from 'react'
import {AuthContext} from "../providers/auth-provider";

export type AuthData = {
    session?: Session | null
    profile?: any | null
    isLoading: boolean
    isLoggedIn: boolean
}


export const useAuth = () => useContext(AuthContext)