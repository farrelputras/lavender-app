import { createContext, FC, PropsWithChildren, useContext, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/services/supabase/client"

type AuthContextType = {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
})

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    // onAuthStateChange handles external session changes (token refresh, revocation).
    // Explicit signIn/signOut update state directly from their return values.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] onAuthStateChange", event, s?.user?.email ?? "null")
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Immediately update state from the response — don't wait for onAuthStateChange
    setSession(data.session)
    setLoading(false)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
