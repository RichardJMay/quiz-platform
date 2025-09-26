'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export default function ResetPasswordPage() {
  const router = useRouter()

  // UI state
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [debug, setDebug] = useState<string[]>([])

  // Refs (must have initial values to satisfy TS)
  const passwordUpdateSuccessRef = useRef<boolean>(false)
  const cancelRef = useRef<(() => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const log = (...a: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log('[reset]', ...a)
    setDebug((d) => [
      ...d,
      a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '),
    ])
  }

  // ------- helpers -------
  const clearPrepTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const markReady = () => {
    if (passwordUpdateSuccessRef.current) return
    clearPrepTimeout()
    setValidSession(true)
    setChecking(false)
    setErr(null)
    log('→ session ready')
  }

  const markInvalid = (message?: string) => {
    if (passwordUpdateSuccessRef.current) return
    clearPrepTimeout()
    setValidSession(false)
    setChecking(false)
    setErr(message ?? 'Invalid or expired reset link. Please request a new password reset.')
    log('→ session invalid:', message)
  }

  // ------- mount: prepare session from link -------
  useEffect(() => {
    let unmounted = false

    // safety timeout (8s)
    timeoutRef.current = setTimeout(() => {
      if (!unmounted && !passwordUpdateSuccessRef.current) {
        markInvalid('Timeout while preparing reset. Please click the email link again.')
      }
    }, 8000)

    // listen to auth changes (and ignore disruptive ones)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        log('auth event:', event, 'session?', !!session)
        if (passwordUpdateSuccessRef.current) {
          log('ignoring auth event — password already updated')
          return
        }
        if (event === 'PASSWORD_RECOVERY') {
          markReady()
        } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
          // ignore these during recovery; Supabase may emit them
          return
        } else if (event === 'SIGNED_IN' && session) {
          // on some flows we’ll see SIGNED_IN after exchange/setSession
          markReady()
        }
      }
    )

    // store unsubscribe for cleanup
    cancelRef.current = () => subscription.unsubscribe()

    const init = async () => {
      const href = typeof window !== 'undefined' ? window.location.href : ''
      log('href:', href)

      // 1) PKCE path (?code=...)
      try {
        const hasCode = href.includes('?code=')
        if (hasCode) {
          log('found ?code= — exchangeCodeForSession')
          const { data, error } = await supabase.auth.exchangeCodeForSession(href)
          if (!error && data?.session) {
            // clean the URL
            window.history.replaceState({}, '', window.location.pathname)
            markReady()
            return
          }
          if (error) log('exchangeCodeForSession error:', error.message)
        }
      } catch (e: any) {
        log('exchangeCodeForSession threw:', e?.message || e)
      }

      // 2) Hash token path (#access_token=&refresh_token=&type=recovery)
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
        const hp = new URLSearchParams(hash)
        const type = hp.get('type')
        const at = hp.get('access_token')
        const rt = hp.get('refresh_token')
        log('hash type:', type, 'has at?', !!at, 'has rt?', !!rt)

        if (type === 'recovery' && at && rt) {
          const { error } = await supabase.auth.setSession({
            access_token: at,
            refresh_token: rt,
          })
          if (!error) {
            window.history.replaceState({}, '', window.location.pathname)
            markReady()
            return
          }
          if (error) log('setSession error:', error.message)
        }
      } catch (e: any) {
        log('setSession threw:', e?.message || e)
      }

      // 3) Fallback: existing session?
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        log('getSession →', !!session, error?.message)
        if (session && !error) {
          markReady()
          return
        }
      } catch (e: any) {
        log('getSession threw:', e?.message || e)
      }

      // if none of the flows succeeded
      markInvalid()
    }

    void init()

    return () => {
      unmounted = true
      clearPrepTimeout()
      cancelRef.current?.()
      cancelRef.current = null
    }
  }, [])

  // ------- submit new password -------
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setSubmitting(true)

    try {
      if (!password || password !== confirm) {
        setErr('Passwords must match.')
        setSubmitting(false)
        return
      }
      if (password.length < 6) {
        setErr('Password must be at least 6 characters.')
        setSubmitting(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      log('submit: session?', !!session)
      if (!session) {
        setErr('Your reset session expired. Please use the link again.')
        setSubmitting(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        if (error.message?.toLowerCase().includes('different')) {
          setErr('Please choose a password different from your current one.')
        } else {
          setErr(error.message || 'Failed to update password.')
        }
        setSubmitting(false)
        return
      }

      // success
      passwordUpdateSuccessRef.current = true
      cancelRef.current?.()
      cancelRef.current = null

      setMsg('Password updated successfully! Redirecting to login…')
      setSubmitting(false)

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (e: any) {
      setErr(e?.message || 'Unexpected error.')
      setSubmitting(false)
    }
  }

  // ------- UI -------
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-xl text-gray-700">Preparing reset…</div>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-lg w-full bg-white rounded-xl shadow p-6">
          <div className="text-5xl mb-2 text-red-500 text-center">✖</div>
          <h1 className="text-2xl font-bold text-red-700 mb-3 text-center">Invalid reset link</h1>
          <p className="text-gray-700 mb-4 text-center">{err}</p>
          <details className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer">Debug</summary>
            <pre className="whitespace-pre-wrap">{debug.join('\n')}</pre>
          </details>
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-600 mb-6">Enter your new password below.</p>

          {msg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {msg}
            </div>
          )}
          {err && !msg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={submitting || !!msg}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                disabled={submitting || !!msg}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md disabled:bg-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !!msg}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating…' : msg ? 'Redirecting…' : 'Update password'}
            </button>
          </form>

          <details className="mt-6 text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer">Debug</summary>
            <pre className="whitespace-pre-wrap">{debug.join('\n')}</pre>
          </details>
        </div>
      </div>
    </div>
  )
}
