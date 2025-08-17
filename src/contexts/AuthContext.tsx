'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isRefreshing: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  refreshSession: () => Promise<void>
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const subscriptionRef = useRef<any>(null)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual session refresh function
  const refreshSession = async () => {
    try {
      setIsRefreshing(true)
      console.log('Manually refreshing session...')
      
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        // If refresh fails, try to get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
        }
      } else if (newSession) {
        console.log('Session refreshed successfully')
        setSession(newSession)
        setUser(newSession.user)
      }
    } catch (error) {
      console.error('Error in refreshSession:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Set up proactive token refresh
  const setupTokenRefresh = (session: Session | null) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      
      // Refresh 5 minutes before expiry (or immediately if less than 5 minutes left)
      const refreshIn = Math.max(0, timeUntilExpiry - (5 * 60 * 1000))
      
      console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes. Scheduling refresh in ${Math.round(refreshIn / 1000 / 60)} minutes.`)
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSession()
      }, refreshIn)
    }
  }

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
          setupTokenRefresh(session)
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
        
        // Handle token refresh events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token was refreshed')
          setIsRefreshing(false)
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Set up refresh timer for new session
        setupTokenRefresh(session)

        // If user just signed in, try to link any existing purchases by email
        if (event === 'SIGNED_IN' && session?.user) {
          await linkExistingPurchases(session.user)
        }
      }
    )
    
    subscriptionRef.current = subscription

    // Also listen for visibility changes to refresh when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        console.log('Tab became visible, checking session...')
        // Check if we need to refresh
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000
          const now = Date.now()
          const timeUntilExpiry = expiresAt - now
          
          // If less than 10 minutes until expiry, refresh now
          if (timeUntilExpiry < 10 * 60 * 1000) {
            refreshSession()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

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
    if (data.session) {
      setupTokenRefresh(data.session)
    }
    return { user: data.user, error }
  }

  const signOut = async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
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
    isRefreshing,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}