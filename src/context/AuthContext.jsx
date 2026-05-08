import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    setProfile(data)
    if (data?.accent_color) {
      document.documentElement.style.setProperty('--accent', data.accent_color)
      document.documentElement.style.setProperty('--lime', data.accent_color)
      localStorage.setItem('focusos_accent', data.accent_color)
    }
    setLoading(false)
  }

  async function refreshProfile() {
    if (!user) return
    await fetchProfile(user.id)
  }

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        name: name || email.split('@')[0],
        username: name || email.split('@')[0],
        streak_count: 0,
        total_focus_minutes: 0,
        total_sessions: 0,
        focus_duration: 25,
        break_duration: 5,
        onboarding_complete: false,
        accent_color: '#b5f23a',
      }, { onConflict: 'user_id' })
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
    if (!error) setProfile(prev => ({ ...prev, ...updates }))
    return error
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
