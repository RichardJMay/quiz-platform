'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        const { data, error }: { data: { session: Session | null }, error: AuthError | null } =
          await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(data.session)
          setUser(data.session?.user ?? null)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error in getSession:', error)
        if (mounted) setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          await linkExistingPurchases(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Handle tab visibility / focus to refresh view of session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Tab became visible, refreshing session...')
        supabase.auth.getSession().then(({ data, error }: { data: { session: Session | null }, error: AuthError | null }) => {
          if (error) {
            console.error('Error refreshing session on visibility change:', error)
          } else if (data.session) {
            console.log('Session refreshed after tab focus')
            setSession(data.session)
            setUser(data.session.user)
          } else {
            console.log('No session found after tab focus')
          }
        })
      }
    }

    const handleFocus = () => {
      if (user) {
        console.log('Window focused, checking session...')
        supabase.auth.getSession().then(({ data, error }: { data: { session: Session | null }, error: AuthError | null }) => {
          if (!error && data.session) {
            setSession(data.session)
            setUser(data.session.user)
          }
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  // Keepalive
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      console.log('Keepalive: Checking session...')
      const { data, error }: { data: { session: Session | null }, error: AuthError | null } =
        await supabase.auth.getSession()
      if (error) console.error('Keepalive error:', error)
      else console.log('Keepalive: Session is', data.session ? 'active' : 'inactive')
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const linkExistingPurchases = async (user: User) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ user_id: user.id })
        .eq('user_email', user.email)
        .is('user_id', null)

      if (error) {
        console.error('Error linking existing purchases:', error)
      } else {
        console.log('Successfully linked existing purchases to user')
      }
    } catch (error) {
      console.error('Error in linkExistingPurchases:', error)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' }
      }
    })
    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const value = { user, session, loading, signUp, signIn, signOut, resetPassword }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
