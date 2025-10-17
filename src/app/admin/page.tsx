'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabasePublic } from '@/lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ExcelUpload from '@/components/ExcelUpload'
import BankedUpload from '@/components/BankedUpload'

const ADMIN_EMAILS = [
  'richiemay1@hotmail.com',
  'richiemay1979@gmail.com',
]

export default function AdminPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mcq' | 'banked'>('mcq')
  const { user } = useAuth()
  const router = useRouter()

  // lifecycle guards
  const mountedRef = useRef(true)
  const authCheckRef = useRef(false)
  const connCheckRef = useRef(false)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // AUTHORIZATION CHECK — narrow dep to user?.id, dedup, safe setState
  useEffect(() => {
    if (authCheckRef.current) return
    authCheckRef.current = true

    ;(async () => {
      try {
        if (!user?.id) {
          if (mountedRef.current) {
            setIsAuthorized(false)
            setAuthLoading(false)
          }
          return
        }

        const ok = ADMIN_EMAILS.includes((user.email || '').toLowerCase())
        if (mountedRef.current) setIsAuthorized(ok)
      } catch (err) {
        console.error('Authorization check failed:', err)
        if (mountedRef.current) setIsAuthorized(false)
      } finally {
        if (mountedRef.current) setAuthLoading(false)
        authCheckRef.current = false
      }
    })()
  }, [user?.id])

  // CONNECTION PROBE — public client, abort/timeout, dedup, safe setState
  useEffect(() => {
    if (authLoading || !isAuthorized) return
    if (connCheckRef.current) return
    connCheckRef.current = true

    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort('timeout'), 8000)

    ;(async () => {
      try {
        const { error } = await supabasePublic
          .from('quizzes')
          .select('id')
          .limit(1)
          .abortSignal(ac.signal)

        if (!mountedRef.current) return
        setConnected(!error)
      } catch (err) {
        if (!mountedRef.current) return
        console.error('Connection failed:', err)
        setConnected(false)
      } finally {
        clearTimeout(timeout)
        if (mountedRef.current) setLoading(false)
        connCheckRef.current = false
      }
    })()

    return () => {
      clearTimeout(timeout)
      ac.abort()
    }
  }, [authLoading, isAuthorized])

  // --- UI states ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Checking authorization...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">You must be logged in to access the admin area.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-4">Sorry, you don't have permission to access this area.</p>
          <p className="text-sm text-gray-500 mb-6">Logged in as: {user.email}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Return to Platform
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Testing database connection...</div>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dr May's Admin Panel</h1>
          <div className="text-red-600 text-xl mb-4">❌ Database connection failed</div>
          <p className="text-gray-600 mb-6">Please check your Supabase configuration.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // --- Main Admin UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Dr May's Admin Panel
          </h1>
          <p className="text-gray-600">Welcome, Dr May! Manage your quiz platform here.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 mb-8">
            <div className="text-center">
              <div className="text-green-600 text-lg mb-2">✅ Database connected successfully</div>
              <p className="text-gray-600 mb-4">
                Upload your Excel file with quiz questions or definitions and terms.
              </p>

              {/* Navigation links */}
              <div className="flex gap-4 justify-center flex-wrap mb-6">
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  View Public Site
                </Link>
                <Link
                  href="/quiz"
                  className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Test Quiz Interface
                </Link>
                <Link
                  href="/progress"
                  className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  View Progress Page
                </Link>
              </div>

              {/* Toggle for quiz type */}
              <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 shadow-sm mb-6">
                <button
                  onClick={() => setActiveTab('mcq')}
                  className={`px-4 py-2 font-medium transition-colors duration-150 ${
                    activeTab === 'mcq'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Standard (MCQ)
                </button>
                <button
                  onClick={() => setActiveTab('banked')}
                  className={`px-4 py-2 font-medium transition-colors duration-150 ${
                    activeTab === 'banked'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Definition–Term (Banked)
                </button>
              </div>

              {/* Upload component */}
              <div className="mt-4">
                {activeTab === 'mcq' ? <ExcelUpload /> : <BankedUpload />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

