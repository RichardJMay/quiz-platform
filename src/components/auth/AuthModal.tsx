'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type AuthMode = 'login' | 'register' | 'reset'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: AuthMode
  onSwitchMode: (mode: AuthMode) => void
}

export default function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showLoginSuggestion, setShowLoginSuggestion] = useState(false)

  const { signIn, signUp, resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setShowLoginSuggestion(false)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Successfully logged in!')
          setTimeout(() => {
            onClose()
            resetForm()
          }, 1000)
        }
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setError('Please enter your full name')
          return
        }
        
        const { error } = await signUp(email, password, fullName.trim())
        if (error) {
          setError(error.message)
        } else {
          setMessage('Registration submitted! Please check your email for confirmation.')
          setShowLoginSuggestion(true)
          // Don't auto-close, let user choose their next action
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Password reset email sent! Check your inbox.')
          setTimeout(() => {
            onSwitchMode('login')
            resetForm()
          }, 3000)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setError('')
    setMessage('')
    setShowLoginSuggestion(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleTryLogin = () => {
    setShowLoginSuggestion(false)
    onSwitchMode('login')
    // Keep email but clear other fields
    setPassword('')
    setFullName('')
    setError('')
    setMessage('')
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Login'
      case 'register': return 'Create Account'
      case 'reset': return 'Reset Password'
      default: return 'Login'
    }
  }

  const getButtonText = () => {
    if (loading) return 'Processing...'
    switch (mode) {
      case 'login': return 'Login'
      case 'register': return 'Create Account'
      case 'reset': return 'Send Reset Email'
      default: return 'Login'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {getTitle()}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                placeholder="Enter your full name"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="Enter your email"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                placeholder="Enter your password"
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
              {message}
            </div>
          )}

          {/* Login Suggestion Box */}
          {message && showLoginSuggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm mb-3">
                📧 <strong>No email received?</strong> You might already have an account with this email address.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTryLogin}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Try Logging In Instead
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginSuggestion(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
                >
                  I&apos;ll Wait for Email
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                onClick={() => onSwitchMode('reset')}
                className="text-blue-600 hover:text-blue-800 text-sm block w-full"
              >
                Forgot your password?
              </button>
              <button
                onClick={() => onSwitchMode('register')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Don&apos;t have an account? Sign up
              </button>
            </>
          )}
          
          {mode === 'register' && !showLoginSuggestion && (
            <button
              onClick={() => onSwitchMode('login')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Already have an account? Login
            </button>
          )}
          
          {mode === 'reset' && (
            <button
              onClick={() => onSwitchMode('login')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}