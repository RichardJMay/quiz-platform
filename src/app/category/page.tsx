'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { ArrowLeft, Clock, Users, Award } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description: string
  price: number
  is_free: boolean
  category_id: string
}

interface Category {
  id: string
  name: string
  description: string
  icon_name: string
  color_class: string
}

interface PurchasedQuiz {
  quiz_id: string
  purchased_at: string
}

function CategoryPageContent() {
  const [category, setCategory] = useState<Category | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [purchasedQuizzes, setPurchasedQuizzes] = useState<PurchasedQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut, loading: authLoading } = useAuth()
  
  const categoryId = searchParams.get('id')
  const categoryName = searchParams.get('name')

  useEffect(() => {
    if (categoryId) {
      loadCategory()
      loadCategoryQuizzes()
      if (user) {
        loadPurchasedQuizzes()
      }
    }
  }, [categoryId, user])

  const loadCategory = async () => {
    const { data, error } = await supabase
      .from('quiz_categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (error) {
      console.error('Error loading category:', error)
    } else {
      setCategory(data)
    }
  }

  const loadCategoryQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free, category_id')
      .eq('category_id', categoryId)
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
      .select('quiz_id, purchased_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    if (error) {
      console.error('Error loading purchased quizzes:', error)
    } else {
      setPurchasedQuizzes(data || [])
    }
  }

  const startQuiz = (quizId: string) => {
    router.push(`/quiz?id=${quizId}`)
  }

  const handleAuthModalOpen = (mode: 'login' | 'register' | 'reset') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      setPurchasedQuizzes([])
      
      try {
        localStorage.clear()
        sessionStorage.clear()
        
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      } catch (storageError) {
        console.log('Storage clear error:', storageError)
      }
      
      setTimeout(() => {
        window.location.replace('/')
      }, 200)
      
    } catch (error) {
      console.error('Sign out error:', error)
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {}
      window.location.replace('/')
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-700 animate-pulse">Loading category content...</div>
        </div>
      </div>
    )
  }

  const colorThemes = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/80 border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 min-w-0">
            <div className="flex items-center space-x-3">
              <div className="relative min-w-0 flex-shrink-0">
                <Image
                  src="/images/logo-header.png"
                  alt="Dr May's Adaptive Learning Analytics"
                  width={320}
                  height={80}
                  className="h-10 w-auto sm:h-14 md:h-16 lg:h-20 max-w-none"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end space-y-2">
              {user ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-gray-700 text-sm sm:text-base">
                    Welcome, {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>
                  <div className="flex space-x-2 sm:space-x-3">
                    <button
                      onClick={() => router.push('/')}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📚 My Quizzes
                    </button>
                    <button
                      onClick={() => router.push('/progress')}
                      className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📊 Progress
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      👋 Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleAuthModalOpen('login')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthModalOpen('register')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Categories
        </button>
      </div>

      {/* Category Header */}
      {category && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 mb-12">
            <div className="flex items-start gap-6">
              <div className={`w-16 h-16 bg-gradient-to-r ${colorThemes[category.color_class as keyof typeof colorThemes] || colorThemes.blue} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-2xl">📚</span>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  {category.name}
                </h1>
                <p className="text-xl text-gray-600 mb-6">
                  {category.description}
                </p>
                
                {/* Category Stats */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    Fluency-Based Learning
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-green-600" />
                    Expert-Designed Content
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-2 text-purple-600" />
                    BCBA Exam Prep
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quizzes in Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {category?.name} Quizzes
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Master your BCBA prep with expert-designed assessments and real-time progress tracking
          </p>
          {!user && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <p className="text-blue-700 font-medium">
                💡 Create a free account to track your progress and access purchased content anytime!
              </p>
            </div>
          )}
        </div>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">New optibl Quizzes Coming Soon!</h3>
            <p className="text-gray-600 mb-6">We're preparing amazing {category?.name} content for you. Check back soon!</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Explore Other Categories
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quizzes.map((quiz) => {
              const isOwned = user && purchasedQuizzes.some(p => p.quiz_id === quiz.id)
              
              return (
                <div key={quiz.id} className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50 ${isOwned ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`}>
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{quiz.title}</h3>
                      {isOwned && <span className="text-green-500 text-xl">✅</span>}
                    </div>
                    <p className="text-gray-600 mb-6">{quiz.description}</p>
                    
                    {!quiz.is_free && (
                      <div className="mb-6">
                        <span className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                          💎 Dr May's Premium - ${quiz.price}
                        </span>
                      </div>
                    )}
                    
                    {isOwned ? (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        ✨ Take Quiz (Owned)
                      </button>
                    ) : quiz.is_free ? (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        🆓 Start Dr May's Free Quiz
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
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={(newMode: 'login' | 'register' | 'reset') => setAuthMode(newMode)}
      />

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/icon.png"
                alt="optibl icon"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-gray-600">© 2025 optibl</span>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <a 
                href="/about" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                About optibl
              </a>
              <a 
                href="/privacy" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Terms of Service
              </a>
              <a 
                href="https://richardjmay.github.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                About Dr May
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-gray-700 animate-pulse">Loading category...</div>
        </div>
      </div>
    }>
      <CategoryPageContent />
    </Suspense>
  )
}