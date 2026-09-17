import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}
const Ctx = createContext<AuthState>({ session: null, profile: null, loading: true, refreshProfile: async () => {} })
export function useAuth() { return useContext(Ctx) }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const heartbeat = useRef<number | null>(null)

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data as Profile | null)
  }
  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s?.user) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Presence heartbeat: mark online, update last_seen periodically
  useEffect(() => {
    if (!session?.user) return
    const uid = session.user.id
    const setOnline = (online: boolean) =>
      supabase.from('profiles').update({ is_online: online, last_seen: new Date().toISOString() }).eq('id', uid)
    setOnline(true)
    heartbeat.current = window.setInterval(() => setOnline(true), 30000)
    const onHide = () => document.visibilityState === 'hidden' ? setOnline(false) : setOnline(true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', () => setOnline(false))
    return () => {
      if (heartbeat.current) clearInterval(heartbeat.current)
      document.removeEventListener('visibilitychange', onHide)
      setOnline(false)
    }
  }, [session?.user?.id])

  return <Ctx.Provider value={{ session, profile, loading, refreshProfile }}>{children}</Ctx.Provider>
}
