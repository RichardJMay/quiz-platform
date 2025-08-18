'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
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

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error in getSession:', error)
        if (mounted) setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // If user just signed in, try to link any existing purchases by email
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

  // Handle tab visibility changes - refresh session when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Tab became visible, refreshing session...')
        // Force a session refresh when tab becomes active
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            console.error('Error refreshing session on visibility change:', error)
          } else if (session) {
            console.log('Session refreshed after tab focus')
            setSession(session)
            setUser(session.user)
          } else {
            console.log('No session found after tab focus')
          }
        })
      }
    }

    const handleFocus = () => {
      if (user) {
        console.log('Window focused, checking session...')
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (!error && session) {
            setSession(session)
            setUser(session.user)
          }
        })
      }
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  // Simple keepalive to prevent token expiry during idle periods
  useEffect(() => {
    if (!user) return

    // Keepalive - refresh session every 10 minutes
    const interval = setInterval(async () => {
      console.log('Keepalive: Checking session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Keepalive error:', error)
      } else {
        console.log('Keepalive: Session is', session ? 'active' : 'inactive')
      }
    }, 10 * 60 * 1000) // Every 10 minutes

    return () => clearInterval(interval)
  }, [user])

  // Link existing purchases made with email to the newly authenticated user
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
        data: {
          full_name: fullName || ''
        }
      }
    })
    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
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

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}