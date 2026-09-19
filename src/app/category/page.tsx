'use client'

import { useEffect, useState, Suspense, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'

type QuizMode = 'mcq' | 'banked'
type ResponseMode = 'options' | 'typed' | null

interface Quiz {
  id: string
  title: string
  description: string
  price: number
  is_free: boolean
  category_id: string
  is_listed?: boolean
  quiz_mode?: QuizMode
  response_mode?: ResponseMode
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

interface AttemptRow {
  quiz_id: string
  accuracy_percentage: number
  fluency_rate: number
  completed_at: string
}

type PerfStats = {
  bestAccuracy: number | null
  bestFluency: number | null
}

function CategoryPageContent() {
  const [category, setCategory] = useState<Category | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [purchasedQuizzes, setPurchasedQuizzes] = useState<PurchasedQuiz[]>([])
  const [perfByQuiz, setPerfByQuiz] = useState<Record<string, PerfStats>>({})
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut, loading: authLoading } = useAuth()

  const categoryId = searchParams.get('id')
  const navigatingRef = useRef(false)

  useEffect(() => {
    if (categoryId) {
      void loadCategory()
      void loadCategoryQuizzes()
      if (user) void loadPurchasedQuizzes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, user?.id])

  const loadCategory = async () => {
    const { data } = await supabase
      .from('quiz_categories')
      .select('*')
      .eq('id', categoryId)
      .single()
    if (data) setCategory(data)
  }

  const loadCategoryQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free, category_id, is_listed, quiz_mode, response_mode')
      .eq('category_id', categoryId)
      .eq('is_listed', true)
      .order('created_at', { ascending: false })

    setQuizzes(data || [])
    setLoading(false)
  }

  const loadPurchasedQuizzes = async () => {
    if (!user) return
    const { data } = await supabase
      .from('purchases')
      .select('quiz_id, purchased_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    setPurchasedQuizzes(data || [])
  }

  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!user || quizzes.length === 0) return
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, accuracy_percentage, fluency_rate, completed_at')
        .eq('user_id', user.id)

      if (error || !data) return

      const byQuiz = new Map<string, AttemptRow[]>()
      data.forEach(row => {
        if (!byQuiz.has(row.quiz_id)) byQuiz.set(row.quiz_id, [])
        byQuiz.get(row.quiz_id)!.push(row)
      })

      const stats: Record<string, PerfStats> = {}
      quizzes.forEach(quiz => {
        const rows = byQuiz.get(quiz.id) || []
        if (rows.length === 0) {
          stats[quiz.id] = { bestAccuracy: null, bestFluency: null }
        } else {
          stats[quiz.id] = {
            bestAccuracy: Math.max(...rows.map(row => row.accuracy_percentage ?? 0)),
            bestFluency: Math.max(...rows.map(row => row.fluency_rate ?? 0)),
          }
        }
      })
      setPerfByQuiz(stats)
    }

    void loadPerformanceData()
  }, [user?.id, quizzes])

  const startQuiz = (quizId: string) => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    router.push(`/quiz?id=${quizId}`)
    setTimeout(() => {
      navigatingRef.current = false
    }, 2000)
  }

  const handleAuthModalOpen = (mode: 'login' | 'register' | 'reset') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setPurchasedQuizzes([])
      try {
        localStorage.clear()
        sessionStorage.clear()
        document.cookie.split(';').forEach((cookie) => {
          document.cookie = cookie
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
        })
      } catch {}
      setTimeout(() => window.location.replace('/'), 200)
    } catch {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      window.location.replace('/')
    }
  }

  const bankedOptions = useMemo(
    () => quizzes.filter(quiz => quiz.quiz_mode === 'banked' && (quiz.response_mode ?? 'options') === 'options'),
    [quizzes]
  )

  const bankedTyped = useMemo(
    () => quizzes.filter(quiz => quiz.quiz_mode === 'banked' && quiz.response_mode === 'typed'),
    [quizzes]
  )

  const SmallQuizCard = ({ quiz }: { quiz: Quiz }) => {
    const isOwned = Boolean(user && purchasedQuizzes.some(purchase => purchase.quiz_id === quiz.id))
    const performance = perfByQuiz[quiz.id]
    const accuracy = performance?.bestAccuracy ?? null
    const fluency = performance?.bestFluency ?? null
    const mode = quiz.response_mode === 'typed' ? 'Typed' : 'Options'
    const aim = mode === 'Typed' ? 8 : 15

    let state: 'learning' | 'accurate' | 'fluent' = 'learning'
    let stateLabel = accuracy === null ? 'Not yet practised' : 'Building'
    if (accuracy === 100 && (fluency ?? 0) >= aim) {
      state = 'fluent'
      stateLabel = 'Fluent'
    } else if (accuracy === 100) {
      state = 'accurate'
      stateLabel = 'Accurate'
    }

    const bestAccuracy = accuracy !== null ? `${accuracy}%` : '—'
    const bestFluency = fluency !== null ? `${fluency.toFixed(1)}/min` : '—'

    return (
      <article className={`bl-quiz-card bl-quiz-card-${state}`} aria-label={`Practice set: ${quiz.title}`}>
        <div className="bl-quiz-card-top">
          <span className={`bl-mode-badge bl-mode-${mode.toLowerCase()}`}>{mode}</span>
          <span className="bl-state-label"><i aria-hidden="true" />{stateLabel}</span>
        </div>

        <h3>{quiz.title}</h3>
        {quiz.description && <p className="bl-quiz-description">{quiz.description}</p>}

        <dl className="bl-quiz-metrics">
          <div><dt>Best accuracy</dt><dd>{bestAccuracy}</dd></div>
          <div><dt>Best rate</dt><dd>{bestFluency}</dd></div>
          <div><dt>Aim</dt><dd>{aim}/min</dd></div>
        </dl>

        <div className="bl-quiz-card-bottom">
          <span className="bl-access-label">{quiz.is_free ? 'Included' : quiz.price ? `£${quiz.price}` : 'Paid access'}</span>
          {isOwned ? (
            <button className="bl-button bl-card-action" onClick={() => startQuiz(quiz.id)}>Practise again</button>
          ) : quiz.is_free ? (
            <button className="bl-button bl-card-action" onClick={() => startQuiz(quiz.id)}>Start practice</button>
          ) : (
            <div className="bl-payment-wrap">
              <PaymentButton
                quizId={quiz.id}
                price={quiz.price}
                title={quiz.title}
                className="bl-card-action"
                onAuthRequired={() => handleAuthModalOpen('register')}
              />
            </div>
          )}
        </div>
      </article>
    )
  }

  const PracticeColumn = ({
    code,
    title,
    description,
    items,
  }: {
    code: string
    title: string
    description: string
    items: Quiz[]
  }) => (
    <section className="bl-practice-column">
      <div className="bl-practice-column-head">
        <div>
          <span>{code}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <strong aria-label={`${items.length} practice sets`}>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <div className="bl-column-empty">No practice sets available yet.</div>
      ) : (
        <div className="bl-quiz-list">{items.map(quiz => <SmallQuizCard key={quiz.id} quiz={quiz} />)}</div>
      )}
    </section>
  )

  if (loading || authLoading) {
    return (
      <div className="bl-page bl-loading" role="status" aria-live="polite">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Loading practice sets</p>
      </div>
    )
  }

  return (
    <div className="bl-page">
      <header className="bl-header">
        <div className="bl-container bl-header-inner">
          <button className="bl-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark" aria-hidden="true">BL</span>
            <span>behavior<span>lingo</span></span>
          </button>

          <div className="bl-header-actions">
            {user ? (
              <>
                <span className="bl-user-label">Signed in as <strong>{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'learner'}</strong></span>
                <button className="bl-button bl-button-quiet" onClick={() => router.push('/')}>Modules</button>
                <button className="bl-button bl-button-quiet" onClick={() => router.push('/progress')}>Progress</button>
                <button className="bl-text-button" onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <>
                <button className="bl-text-button" onClick={() => handleAuthModalOpen('login')}>Log in</button>
                <button className="bl-button bl-button-small" onClick={() => handleAuthModalOpen('register')}>Create account</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="bl-category-main">
        <div className="bl-container">
          <button className="bl-back-link" onClick={() => router.push('/')}>
            <ArrowLeft size={16} strokeWidth={2} /> All modules
          </button>

          <section className="bl-category-intro">
            <div className="bl-category-code">CONTENT_AREA</div>
            <h1>{category?.name || 'Fluency practice'}</h1>
            <p>{category?.description}</p>
            <div className="bl-category-meta">
              <span><i aria-hidden="true" /> Options aim: 15/min</span>
              <span><i aria-hidden="true" /> Typed aim: 8/min</span>
              <span><i aria-hidden="true" /> 100% accuracy target</span>
            </div>
          </section>

          <div className="bl-mastery-key" aria-label="Mastery status key">
            <span>Card status</span>
            <span><i className="bl-key-learning" />Building</span>
            <span><i className="bl-key-accurate" />Accurate</span>
            <span><i className="bl-key-fluent" />Fluent</span>
          </div>

          {quizzes.length === 0 ? (
            <div className="bl-empty-state bl-category-empty">
              <span className="bl-empty-code">CONTENT_LOADING</span>
              <h2>Practice sets are in preparation.</h2>
              <p>More content for this area is coming soon.</p>
              <button className="bl-button bl-button-primary" onClick={() => router.push('/')}>Explore other modules</button>
            </div>
          ) : (
            <div className="bl-practice-columns">
              <PracticeColumn
                code="MODE_01"
                title="Options practice"
                description="Build accurate discrimination with response support."
                items={bankedOptions}
              />
              <PracticeColumn
                code="MODE_02"
                title="Typed practice"
                description="Strengthen independent retrieval without response prompts."
                items={bankedTyped}
              />
            </div>
          )}
        </div>
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={(newMode: 'login' | 'register' | 'reset') => setAuthMode(newMode)}
      />

      <footer className="bl-footer">
        <div className="bl-container bl-footer-inner">
          <div><div className="bl-footer-wordmark">behavior<span>lingo</span></div><p>Fluency training for behaviour analysis.</p></div>
          <div className="bl-footer-links">
            <button onClick={() => router.push('/about')}>About</button>
            <button onClick={() => router.push('/privacy')}>Privacy</button>
            <button onClick={() => router.push('/terms')}>Terms</button>
            <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">Dr May</a>
          </div>
          <span className="bl-copyright">© 2026 BehaviorLingo</span>
        </div>
      </footer>
    </div>
  )
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="bl-page bl-loading" role="status" aria-live="polite">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Loading module</p>
      </div>
    }>
      <CategoryPageContent />
    </Suspense>
  )
}
