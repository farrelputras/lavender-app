import { useEffect, useState, useCallback } from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "../supabase/client"

type AppRole = "ops" | "admin"

interface UseSessionResult {
  session: Session | null
  role: AppRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("app_config")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()
  return (data?.role as AppRole) ?? null
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        setRole(await fetchRole(data.session.user.id))
      }
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setRole(s?.user ? await fetchRole(s.user.id) : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return { session, role, loading, signIn, signOut }
}
