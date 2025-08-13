'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import ExcelUpload from '@/components/ExcelUpload'

export default function AdminPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  // List of authorized admin emails
  const ADMIN_EMAILS = [
    'richiemay1@hotmail.com', // Replace with your actual email
    'richiemay1979@gmail.com', // Example - replace with your real email
  ]

  useEffect(() => {
    async function checkAuthorization() {
      try {
        if (!user) {
          console.log('No user logged in')
          setAuthLoading(false)
          return
        }

        const userEmail = user.email?.toLowerCase()
        console.log('Checking authorization for:', userEmail)
        
        if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
          setIsAuthorized(true)
          console.log('User authorized as admin')
        } else {
          console.log('User not authorized as admin')
          setIsAuthorized(false)
        }
      } catch (error) {
        console.error('Authorization check failed:', error)
        setIsAuthorized(false)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuthorization()
  }, [user])

  useEffect(() => {
    async function testConnection() {
      if (!isAuthorized) return
      
      try {
        const { data, error } = await supabase.from('quizzes').select('*').limit(1)
        console.log('Connection test:', { data, error })
        setConnected(true)
      } catch (err) {
        console.error('Connection failed:', err)
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && isAuthorized) {
      testConnection()
    }
  }, [isAuthorized, authLoading])

  // Show loading while checking authentication
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

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            You must be logged in to access the admin area.
          </p>
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

  // Block unauthorized users
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-4">
            Sorry, you don't have permission to access this area.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Logged in as: {user.email}
          </p>
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

  // Show loading while testing database connection
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

  // Show database connection error
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dr May's Admin Panel</h1>
          <div className="text-red-600 text-xl mb-4">
            ❌ Database connection failed
          </div>
          <p className="text-gray-600 mb-6">
            Please check your Supabase configuration.
          </p>
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

  // Main admin interface - only shown to authorized users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Dr May's Admin Panel
          </h1>
          <p className="text-gray-600">
            Welcome, Dr May! Manage your quiz platform here.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 mb-8">
            <div className="text-center">
              <div className="text-green-600 text-lg mb-2">
                ✅ Database connected successfully
              </div>
              <p className="text-gray-600 mb-4">
                Upload your Excel file with quiz questions and set pricing.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
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
            </div>
          </div>

          <ExcelUpload />
        </div>
      </div>
    </div>
  )
}