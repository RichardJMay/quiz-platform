// Modern SaaS Landing Page - Dr May's Quiz Master Pro

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '../contexts/AuthContext'
import Image from 'next/image'

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
    try {
      const { error } = await signOut()
      setShowMyQuizzes(false)
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
          <div className="text-xl text-gray-700 animate-pulse">Loading your learning platform...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Header */}
      <header className="backdrop-blur-sm bg-white/80 border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div className="flex items-center space-x-3">
              {/* Profile Picture in Header */}
              <div className="relative">
                <Image
                  src="/images/dr-may-profile.jpg"
                  alt="Dr May"
                  width={56}
                  height={56}
                  className="rounded-full border-2 border-gradient-to-r from-blue-600 to-purple-600 shadow-lg"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dr May's Quiz Master Pro
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Learn with Expert Guidance</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end space-y-2">
              {user ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-gray-700 text-sm sm:text-base">
                    Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}! 👋
                  </span>
                  <div className="flex space-x-2 sm:space-x-3">
                    <button
                      onClick={() => setShowMyQuizzes(!showMyQuizzes)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📚 My Quizzes ({purchasedQuizzes.length})
                    </button>
                    <button
                      onClick={() => router.push('/progress')}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📊 Progress
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      👋 Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleAuthModalOpen('login')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthModalOpen('register')}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!showMyQuizzes && (
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Hero Text */}
              <div className="flex-1 text-center lg:text-left animate-fade-in">
                <h2 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Master Skills with
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block sm:inline">
                    {' '}Dr May's Expert Guidance
                  </span>
                </h2>
                <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto lg:mx-0 leading-relaxed">
                  Track your fluency, measure progress, and achieve learning goals with our advanced analytics platform designed by Dr May
                </p>
                
                {!user && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                    <button
                      onClick={() => handleAuthModalOpen('register')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      🚀 Start Learning with Dr May
                    </button>
                    <p className="text-gray-500">No credit card required</p>
                  </div>
                )}
              </div>
              
              {/* Hero Profile Section */}
              <div className="flex-none lg:w-80">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 text-center">
                  <div className="relative mb-6">
                    <Image
                      src="/images/dr-may-profile.jpg"
                      alt="Dr May - Learning Expert"
                      width={150}
                      height={150}
                      className="rounded-full mx-auto border-4 border-gradient-to-r from-blue-600 to-purple-600 shadow-lg"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      ✓
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Dr May</h3>
                  <p className="text-blue-600 font-semibold mb-1">Dr May PhD BCBA-D</p>
                  <p className="text-gray-700 font-medium mb-3">Associate Professor in Behaviour Analysis</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    &ldquo;I&apos;ve designed these quizzes to help you achieve real fluency and track meaningful progress. Let&apos;s learn together!&rdquo;
                  </p>
                  <a
                    href="https://richardjmay.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🌐 About Dr May
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Features Section */}
        {!showMyQuizzes && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Dr May's Platform?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Professionally designed learning experiences with proven methodology
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Expert-Designed Assessments</h3>
                <p className="text-gray-600">Dr May&apos;s proven methodology tracks your speed and accuracy with advanced analytics that monitor 30+ correct answers per minute</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Professional Progress Analytics</h3>
                <p className="text-gray-600">Visualize your improvement with Dr May&apos;s professional charts and detailed performance metrics designed for optimal learning outcomes</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Personalized Learning Path</h3>
                <p className="text-gray-600">Access Dr May&apos;s curated content anytime, track your attempts, and focus on areas that need improvement with expert guidance</p>
              </div>
            </div>
          </section>
        )}

        {/* My Quizzes Section */}
        {user && showMyQuizzes && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Your Learning Dashboard</h2>
              <p className="text-xl text-gray-600">
                Continue your journey with Dr May&apos;s expert guidance
              </p>
            </div>
            
            {purchasedQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
                <div className="text-6xl mb-4">🎓</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Ready to Start Learning with Dr May?</h3>
                <p className="text-gray-600 mb-6">Purchase your first quiz below to unlock personalized progress tracking designed by Dr May!</p>
                <button
                  onClick={() => setShowMyQuizzes(false)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Browse Dr May&apos;s Quizzes
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {purchasedQuizzes.map((purchase) => (
                  <div key={purchase.quiz_id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50 border-l-4 border-l-green-500">
                    <div className="p-8">
                      <div className="flex items-center mb-3">
                        <span className="text-green-500 text-2xl mr-3">✅</span>
                        <h3 className="text-xl font-bold text-gray-900">{purchase.quizzes?.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{purchase.quizzes?.description}</p>
                      <p className="text-sm text-gray-500 mb-6">
                        Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                      </p>
                      
                      <button
                        onClick={() => startPurchasedQuiz(purchase.quiz_id)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        🚀 Continue Learning
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-center mt-8">
              <button
                onClick={() => setShowMyQuizzes(false)}
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Browse More of Dr May&apos;s Quizzes
              </button>
            </div>
          </div>
        )}

        {/* Available Quizzes Section */}
        {!showMyQuizzes && (
          <>
            <section>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Choose Your Learning Path</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Dr May&apos;s interactive quizzes with immediate feedback and advanced fluency tracking to accelerate your learning
                </p>
                {!user && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 font-medium">
                      💡 Create a free account to track your progress and access Dr May&apos;s purchased content anytime!
                    </p>
                  </div>
                )}
              </div>
              
              {quizzes.length === 0 ? (
                <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2">Dr May&apos;s New Quizzes Coming Soon!</h3>
                  <p className="text-gray-600">We&apos;re preparing amazing content for you. Check back soon!</p>
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
                                💎 Dr May&apos;s Premium - ${quiz.price}
                              </span>
                            </div>
                          )}
                          
                          {isOwned ? (
                            <button
                              onClick={() => startPurchasedQuiz(quiz.id)}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              ✨ Take Quiz (Owned)
                            </button>
                          ) : quiz.is_free ? (
                            <button
                              onClick={() => startFreeQuiz(quiz)}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              🆓 Start Dr May&apos;s Free Quiz
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
            </section>
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

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">Q</span>
              </div>
              <span className="text-gray-600">© 2025 Dr May&apos;s Quiz Master Pro</span>
            </div>
            
            <div className="flex space-x-6 text-sm">
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

      {/* Floating Elements */}
      <div className="fixed top-20 left-4 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="fixed bottom-20 right-4 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
    </div>
  )
}