'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function QuizAccessContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [quizTitle, setQuizTitle] = useState('')
  const [sessionId, setSessionId] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id')
    
    if (!sessionIdParam) {
      setStatus('error')
      return
    }

    setSessionId(sessionIdParam)
    verifyPayment(sessionIdParam)
  }, [searchParams])

  const verifyPayment = async (sessionId: string) => {
    try {
      // For now, we'll simulate success and extract quiz info from the session
      // Later we can add proper payment verification via webhook
      
      // Temporary success - we'll improve this with proper verification
      setQuizTitle('Your Purchased Quiz')
      setStatus('success')
      
      console.log('Payment successful for session:', sessionId)
    } catch (error) {
      console.error('Payment verification error:', error)
      setStatus('error')
    }
  }

  const handleStartQuiz = () => {
    // For now, redirect to main quiz page
    // Later we'll create secure quiz access with the session ID
    router.push('/quiz')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Verifying your payment...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait while we confirm your purchase</div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">
            There was an issue verifying your payment. Please contact support or try again.
          </p>
          <div className="space-y-3">
            <Link 
              href="/" 
              className="block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return Home
            </Link>
            <div className="text-sm text-gray-500">
              Session ID: {sessionId}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-green-800 mb-4">Payment Successful!</h1>
        <p className="text-gray-700 mb-2">
          Thank you for your purchase! You now have access to:
        </p>
        <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
          <h2 className="font-semibold text-lg text-gray-800">{quizTitle}</h2>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleStartQuiz}
            className="w-full bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Start Your Quiz Now
          </button>
          
          <Link 
            href="/" 
            className="block text-gray-600 hover:text-gray-800 text-sm"
          >
            Return to Home
          </Link>
        </div>
        
        <div className="mt-6 pt-4 border-t border-green-200">
          <div className="text-xs text-gray-500">
            Transaction ID: {sessionId.slice(-12)}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-xl text-gray-700">Loading...</div>
      </div>
    </div>
  )
}

export default function QuizAccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <QuizAccessContent />
    </Suspense>
  )
}