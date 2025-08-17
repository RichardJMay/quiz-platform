'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '../contexts/AuthContext'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase'

interface Category {
  id: string
  name: string
  description: string
  icon_name: string
  color_class: string
  quizzes: { count: number }[]
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
  const [categories, setCategories] = useState<Category[]>([])
  const [purchasedQuizzes, setPurchasedQuizzes] = useState<PurchasedQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [showMyQuizzes, setShowMyQuizzes] = useState(false)
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()

  const firstRun = useRef(false);

useEffect(() => {
  console.log('Home page loaded, clearing payment state');
  
  // Only clear specific keys, not all storage
  try {
    localStorage.removeItem('stripe_payment_intent');
    sessionStorage.removeItem('stripe_payment_intent');
  } catch (error) {
    console.log('Storage cleanup failed:', error);
  }

  if (!firstRun.current) {
    firstRun.current = true;
    loadCategories();
  }
  
  if (user) {
    loadPurchasedQuizzes();
  }
}, [user?.id]);

  const loadCategories = async () => {
  console.log('=== loadCategories START ===', new Date().toISOString());
  
  try {
    console.log('Making Supabase query...');
    
    const { data, error } = await supabasePublic
      .from('quiz_categories')
      .select(`*`)
      .eq('is_active', true)
      .order('display_order')

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Supabase error:', error)
      setCategories([])
    } else {
      console.log('Setting categories:', data?.length || 0, 'items');
      setCategories(data || [])
    }
  } catch (err) {
    console.error('Unexpected error in loadCategories:', err);
    setCategories([])
  } finally {
    console.log('=== loadCategories END - setting loading to false ===');
    setLoading(false)
  }
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

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    router.push(`/category?id=${categoryId}&name=${encodeURIComponent(categoryName)}`)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 min-w-0">
            <div className="flex items-center space-x-3">
              {/* New Professional Logo - Fixed Mobile Width */}
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
                      onClick={() => setShowMyQuizzes(!showMyQuizzes)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📚 My Quizzes ({purchasedQuizzes.length})
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

      {/* Hero Section */}
      {!showMyQuizzes && (
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              {/* Hero Text */}
              <div className="flex-1 text-center lg:text-left animate-fade-in">
                {/* Logo Above Main Message */}
                <div className="mb-8 flex justify-center lg:justify-start">
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
                    <Image
                      src="/images/logo-header.png"
                      alt="Dr May's Adaptive Learning Analytics"
                      width={480}
                      height={120}
                      className="w-[220px] h-auto sm:w-[320px] md:w-[480px]"
                      priority
                      sizes="(max-width: 640px) 220px, (max-width: 768px) 320px, 480px"
                    />
                  </div>
                </div>
                
                <h2 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Personalised Learning Pathways
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block sm:inline">
                    {' '}for BCBA Exam Success
                  </span>
                </h2>
                <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto lg:mx-0 leading-relaxed">
                  Master your BCBA prep with a personalised learning platform — build fluency, measure progress, connect with peers, and join weekly live drop-in sessions.
                </p>
                
                {!user && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                    <button
                      onClick={() => handleAuthModalOpen('register')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      🚀 Start Learning
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Dr Rich May</h3>
                  <p className="text-blue-600 font-semibold mb-1">Dr Richard May PhD BCBA-D</p>
                  <p className="text-gray-700 font-medium mb-3">Founder and Head of Learning at optibl</p>
                  <p className="text-gray-700 font-medium mb-3">Associate Professor of Behaviour Analysis</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    &ldquo;The opitbl BCBA exam preparation will help you achieve real mastery of the task list. Using the science of learning to teach the science of learning!&rdquo;
                  </p>
                  <a
                    href="https://richardjmay.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
           <div className="text-center mb-12 mt-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What is optibl?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                optibl is a mastery engine — using the science of learning to keep you in the sweet spot for fast, lasting progress
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Science of learning</h3>
                <p className="text-gray-600">Expertly sequenced and fluency-based assessment to help you build speed, accuracy, and long-term retention</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Progress Analytics</h3>
                <p className="text-gray-600">Placement tests, performance metrics and data analysis designed to boost your progress and identify areas for improvement</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Weekly Live Drop-In Sessions</h3>
                <p className="text-gray-600">A unique opportunity to join Dr May live for interactive Q&A and study guidance every week</p>
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
                Continue your optibl journey
              </p>
            </div>
            
            {purchasedQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
                <div className="text-6xl mb-4">🎓</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Ready to Start Learning with optibl?</h3>
                <p className="text-gray-600 mb-6">Purchase your first quiz below to unlock personalized progress tracking</p>
                <button
                  onClick={() => setShowMyQuizzes(false)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Browse optibl Categories
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
                Browse More optibl Categories
              </button>
            </div>
          </div>
        )}

        {/* Categories Section */}
        {!showMyQuizzes && (
          <>
            <section>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">Choose Your optibl Learning Path</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Expert-designed categories covering all aspects of BCBA exam preparation with fluency-based learning
                </p>
                {!user && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 font-medium">
                      💡 Create a free account to track your progress and access purchased content anytime!
                    </p>
                  </div>
                )}
              </div>
              
              {categories.length === 0 ? (
                <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2">New optibl Categories Coming Soon!</h3>
                  <p className="text-gray-600">We&apos;re preparing amazing content for you. Check back soon!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categories.map((category) => {
                    const quizCount = category.quizzes?.[0]?.count || 0
                    
                    return (
                      <div
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id, category.name)}
                        className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-200/50 hover:border-gray-300 transform hover:-translate-y-2"
                      >
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 transition-all duration-300">
                          <span className="text-white text-2xl">📚</span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                          {category.name}
                        </h3>
                        
                        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                          {category.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
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
              <button
                onClick={() => router.push('/about')}
                className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                About optibl
               </button>
                <button
                  onClick={() => router.push('/privacy')}
                  className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                 >
                    Privacy Policy
                  </button>
                  <button
                    onClick={() => router.push('/terms')}
                    className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                   Terms of Service
                  </button>
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