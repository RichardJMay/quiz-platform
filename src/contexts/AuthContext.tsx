'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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

  // Track the last logical user id we emitted to avoid duplicate updates
  const lastUserIdRef = useRef<string | null>(null)

  // Track which user id we've already run linkExistingPurchases for
  const purchasesLinkedForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) console.error('Error getting session:', error)

        setSession(session ?? null)
        setUser(session?.user ?? null)
        lastUserIdRef.current = session?.user?.id ?? null
        setLoading(false)
      } catch (error) {
        console.error('Error in getSession:', error)
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return

        const nextId = nextSession?.user?.id ?? null

        // If Supabase replays SIGNED_IN for the same user (tab focus/refresh), don't swap the user object
        if (event === 'SIGNED_IN' && nextId && nextId === lastUserIdRef.current) {
          console.log('[auth] duplicate SIGNED_IN for same user — ignoring user update')
          setSession(nextSession ?? null) // keep session fresh
          // (do NOT call setUser)
          return
        }

        // Token refresh should not rebuild the user object
        if (event === 'TOKEN_REFRESHED') {
          setSession(nextSession ?? null)
          return
        }

        // For true transitions (SIGNED_IN with new id, SIGNED_OUT, etc.)
        lastUserIdRef.current = nextId
        setSession(nextSession ?? null)
        setUser(nextSession?.user ?? null)
        setLoading(false)

        // Only try to link purchases once per user id
        if (event === 'SIGNED_IN' && nextSession?.user) {
          if (purchasesLinkedForUserIdRef.current !== nextSession.user.id) {
            await linkExistingPurchases(nextSession.user)
            purchasesLinkedForUserIdRef.current = nextSession.user.id
          }
        }

        // On SIGNED_OUT, clear the marker
        if (event === 'SIGNED_OUT') {
          purchasesLinkedForUserIdRef.current = null
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Keepalive — optional but harmless
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Keepalive error:', error)
      } else {
        console.log('Keepalive: session', session ? 'active' : 'inactive')
      }
    }, 10 * 60 * 1000)
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
      options: { data: { full_name: fullName || '' } }
    })
    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, error }
  }

  const signOut = async () => {
    purchasesLinkedForUserIdRef.current = null
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
