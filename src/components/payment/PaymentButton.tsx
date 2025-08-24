'use client'

import { useState } from 'react'
import { stripePromise } from '@/lib/stripe'
import { useAuth } from '../../contexts/AuthContext'

interface PaymentButtonProps {
  quizId: string
  price: number
  title: string
  className?: string
  onAuthRequired?: () => void
}

export default function PaymentButton({ 
  quizId, 
  price, 
  title, 
  className = "",
  onAuthRequired
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleClick = async () => {
    // Require authentication first
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired() // Open auth modal
      }
      return
    }

    // User is authenticated, proceed with payment
    setLoading(true)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quizId, 
          userEmail: user.email,
          userId: user.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionId } = await response.json()

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

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl ${
        user 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Processing...
        </span>
      ) : user ? (
        `Purchase for $${price}`
      ) : (
        `Create Account to Purchase ($${price})`
      )}
    </button>
  )
}