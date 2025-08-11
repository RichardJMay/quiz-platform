// Testing feature branch deployment

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '../contexts/AuthContext'

interface Quiz {
  id: string
  title: string
  description: string
  price: number
  is_free: boolean
}

interface PurchasedQuiz {
  quiz_id: string
  purchased_at: string
  quizzes: {
    id: string
    title: string
    description: string
  } | null
}

export default function LandingPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [purchasedQuizzes, setPurchasedQuizzes] = useState<PurchasedQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [showMyQuizzes, setShowMyQuizzes] = useState(false)
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()

  useEffect(() => {
    loadQuizzes()
    if (user) {
      loadPurchasedQuizzes()
    }
  }, [user])

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes(data || [])
    }
    setLoading(false)
  }

  const loadPurchasedQuizzes = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('purchases')
      .select(`
        quiz_id,
        purchased_at,
        quizzes!inner(id, title, description)
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false })

    if (error) {
      console.error('Error loading purchased quizzes:', error)
    } else {
      // Cast the data to handle Supabase's type inference issues
      const typedData = (data || []).map(item => ({
        ...item,
        quizzes: Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes
      })) as PurchasedQuiz[]
      setPurchasedQuizzes(typedData)
    }
  }

  const startFreeQuiz = (quiz: Quiz) => {
    router.push(`/quiz?id=${quiz.id}`)
  }

  const startPurchasedQuiz = (quizId: string) => {
    router.push(`/quiz?id=${quizId}`)
  }

  const handleAuthModalOpen = (mode: 'login' | 'register' | 'reset') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    console.log('Sign out clicked - before:', { user: user?.email })
    
    try {
      // Clear Supabase session
      const { error } = await signOut()
      console.log('Supabase sign out result:', { error })
      
      // Clear local state immediately
      setShowMyQuizzes(false)
      setPurchasedQuizzes([])
      
      // Nuclear option: Clear all browser storage on mobile
      try {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear any cookies related to authentication
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      } catch (storageError) {
        console.log('Storage clear error:', storageError)
      }
      
      // Force navigation to home page (more aggressive than reload)
      setTimeout(() => {
        console.log('Forcing navigation to clear state')
        window.location.replace('/')
      }, 200)
      
    } catch (error) {
      console.error('Sign out error:', error)
      // Nuclear fallback - clear everything and redirect
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {}
      window.location.replace('/')
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading available quizzes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Auth Buttons */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quiz Platform</h1>
            
            {/* Auth Section */}
            <div className="flex flex-col sm:items-end space-y-2">
              {user ? (
                // Logged in state
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-gray-700 text-sm sm:text-base">
                    Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <div className="flex space-x-2 sm:space-x-3">
                    <button
                      onClick={() => setShowMyQuizzes(!showMyQuizzes)}
                      className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      My Quizzes ({purchasedQuizzes.length})
                    </button>
                    <button
                      onClick={() => router.push('/progress')}
                      className="bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    >
                      Progress
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="bg-gray-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                // Not logged in state
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleAuthModalOpen('login')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthModalOpen('register')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* My Quizzes Section */}
        {user && showMyQuizzes && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">My Purchased Quizzes</h2>
              <p className="text-xl text-gray-600">
                Click any quiz below to start taking it
              </p>
            </div>
            
            {purchasedQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Purchased Quizzes Yet</h3>
                <p className="text-gray-600 mb-4">Purchase some quizzes below to see them here!</p>
                <button
                  onClick={() => setShowMyQuizzes(false)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Available Quizzes
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {purchasedQuizzes.map((purchase) => (
                  <div key={purchase.quiz_id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border-2 border-green-200">
                    <div className="p-8">
                      <div className="flex items-center mb-3">
                        <span className="text-green-600 text-2xl mr-2">✅</span>
                        <h3 className="text-xl font-bold text-gray-900">{purchase.quizzes?.title || 'Quiz'}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{purchase.quizzes?.description || 'No description available'}</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                      </p>
                      
                      <button
                        onClick={() => startPurchasedQuiz(purchase.quiz_id)}
                        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Take Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-center mt-8">
              <button
                onClick={() => setShowMyQuizzes(false)}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Browse More Quizzes
              </button>
            </div>
          </div>
        )}

        {/* All Quizzes Section */}
        {!showMyQuizzes && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Available Quizzes</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Test your knowledge with interactive quizzes that provide immediate feedback 
                and track your fluency performance in real-time.
              </p>
              {!user && (
                <p className="text-blue-600 mt-4 font-medium">
                  💡 Create an account to access your purchased quizzes anytime!
                </p>
              )}
            </div>
            
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Quizzes Available Yet</h3>
                <p className="text-gray-600">Check back soon for new quizzes!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {quizzes.map((quiz) => {
                  // Check if user already owns this quiz
                  const isOwned = user && purchasedQuizzes.some(p => p.quiz_id === quiz.id)
                  
                  return (
                    <div key={quiz.id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${isOwned ? 'border-2 border-green-200' : ''}`}>
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{quiz.title}</h3>
                          {isOwned && <span className="text-green-600 text-xl">✅</span>}
                        </div>
                        <p className="text-gray-600 mb-4">{quiz.description}</p>
                        
                        {/* Price display for paid quizzes */}
                        {!quiz.is_free && (
                          <div className="mb-4">
                            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                              ${quiz.price}
                            </span>
                          </div>
                        )}
                        
                        {/* Conditional button rendering */}
                        {isOwned ? (
                          <button
                            onClick={() => startPurchasedQuiz(quiz.id)}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            Take Quiz (Owned)
                          </button>
                        ) : quiz.is_free ? (
                          <button
                            onClick={() => startFreeQuiz(quiz)}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                          >
                            Start Free Quiz
                          </button>
                        ) : (
                          <PaymentButton
                            quizId={quiz.id}
                            price={quiz.price}
                            title={quiz.title}
                            className="w-full"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={(newMode: 'login' | 'register' | 'reset') => setAuthMode(newMode)}
      />
    </div>
  )
}