'use client'

import { useState } from 'react'
import { stripePromise } from '@/lib/stripe'
import { useAuth } from '../../contexts/AuthContext'

interface PaymentButtonProps {
  quizId: string
  price: number
  title: string
  className?: string
}

export default function PaymentButton({ 
  quizId, 
  price, 
  title, 
  className = "" 
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  
  const { user } = useAuth()

  const handleInitiatePayment = () => {
    if (user) {
      // User is authenticated, proceed directly to payment
      handleAuthenticatedPayment()
    } else {
      // User not authenticated, show options
      setShowAuthPrompt(true)
    }
  }

  const handleAuthenticatedPayment = async () => {
    if (!user?.email) return

    setLoading(true)

    try {
      // Create checkout session with authenticated user
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quizId, 
          userEmail: user.email,
          userId: user.id  // Include user ID for linking
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const result = await stripe.redirectToCheckout({ sessionId })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestPayment = () => {
    setShowAuthPrompt(false)
    setShowEmailInput(true)
  }

  const handleGuestPaymentSubmit = async () => {
    if (!email.trim()) {
      alert('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      // Create checkout session for guest
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quizId, 
          userEmail: email.trim() 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const result = await stripe.redirectToCheckout({ sessionId })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowEmailInput(false)
    setShowAuthPrompt(false)
    setEmail('')
  }

  // Auth prompt for non-authenticated users
  if (showAuthPrompt) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Purchase Quiz</h3>
          <p className="text-sm text-gray-600 mb-4">
            To access your quiz anytime, we recommend creating an account. Or continue as guest.
          </p>
          
          <div className="space-y-2">
            <p className="text-xs text-blue-600 font-medium">
              ✨ With an account: Access your purchased quizzes anytime
            </p>
            <p className="text-xs text-gray-500">
              As guest: One-time access only
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCancel()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Create Account First (Recommended)
        </button>
        
        <button
          onClick={handleGuestPayment}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Continue as Guest
        </button>
        
        <button
          onClick={handleCancel}
          className="w-full text-gray-600 hover:text-gray-800 text-sm"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Email input for guest checkout
  if (showEmailInput) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll send quiz access details to this email
          </p>
        </div>
        
        <button
          onClick={handleGuestPaymentSubmit}
          disabled={loading || !email.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${price} as Guest`
          )}
        </button>
        
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full text-gray-600 hover:text-gray-800 text-sm disabled:text-gray-400"
        >
          Cancel
        </button>
      </div>
    )
  }

  // Main purchase button
  return (
    <button
      onClick={handleInitiatePayment}
      disabled={loading}
      className={`bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors ${className}`}
    >
      {user ? `Purchase Quiz - $${price}` : `Purchase Quiz - $${price}`}
    </button>
  )
}