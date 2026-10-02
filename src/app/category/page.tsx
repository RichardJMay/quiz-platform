'use client'

import { useEffect, useState, Suspense, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'
import { getPackGuide, pathwayOrder } from '@/lib/quiz-pathway'
import { unlockedOptionsPacks, type UnlockAttempt } from '@/lib/options-unlock'

type QuizMode = 'mcq' | 'banked'
type ResponseMode = 'options' | 'typed' | null

interface Quiz {
  id: string
  title: string
  description: string
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
  const [perfByQuiz, setPerfByQuiz] = useState<Record<string, PerfStats>>({})
  const [performanceUserId, setPerformanceUserId] = useState<string | null>(null)
  const [typedLinks, setTypedLinks] = useState<Record<string, string>>({})
  const [contextPacks, setContextPacks] = useState<Set<string>>(new Set())
  const [unlockedOptions, setUnlockedOptions] = useState<Set<string>>(new Set())
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [practiceMode, setPracticeMode] = useState<'options' | 'typed' | 'context'>('options')

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut, loading: authLoading } = useAuth()

  const categoryId = searchParams.get('id')
  const navigatingRef = useRef(false)

  useEffect(() => {
    if (categoryId) {
      void loadCategory()
      void loadCategoryQuizzes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

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
      .select('id, title, description, category_id, is_listed, quiz_mode, response_mode')
      .eq('category_id', categoryId)
      .eq('is_listed', true)
      .order('created_at', { ascending: false })

    setQuizzes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const loadPerformanceData = async () => {
      setPerformanceUserId(null)
      setPerfByQuiz({})
      setTypedLinks({})
      setUnlockedOptions(new Set())
      setContextPacks(new Set())
      setAccessError(false)
      if (!user || quizzes.length === 0) return
      setAccessLoading(true)
      try {
        const records: Array<AttemptRow & UnlockAttempt> = []
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('quiz_attempts')
            .select('quiz_id, accuracy_percentage, fluency_rate, completed_at, completed_day_ldn, attempt_purpose, session_id, completed, independent, assistance_used, terminal_option_condition, correct_answers, total_questions, learner_local_date')
            .eq('user_id', user.id).order('completed_at', { ascending: true })
            .range(offset, offset + 499)
          if (error) throw error
          records.push(...((data || []) as Array<AttemptRow & UnlockAttempt>))
          if (!data || data.length < 500) break
        }
        const [linkResult, progressResult, contextResult] = await Promise.all([
          supabase.from('adaptive_pack_links').select('typed_quiz_id, options_quiz_id'),
          supabase.from('adaptive_pack_progress').select('quiz_id').eq('user_id', user.id),
          supabase.rpc('context_practice_packs'),
        ])
        if (linkResult.error) throw linkResult.error
        if (progressResult.error) throw progressResult.error
        if (contextResult.error) throw contextResult.error
        if (cancelled) return
        setContextPacks(new Set((contextResult.data || []) as string[]))
        setTypedLinks(Object.fromEntries((linkResult.data || []).map(row => [row.typed_quiz_id, row.options_quiz_id])))
        setUnlockedOptions(unlockedOptionsPacks(records, new Set((progressResult.data || []).map(row => row.quiz_id))))

      const byQuiz = new Map<string, AttemptRow[]>()
      records.forEach(row => {
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
      setPerformanceUserId(user.id)
      } catch (error) {
        console.error('Could not load practice access:', error)
        if (!cancelled) setAccessError(true)
      } finally {
        if (!cancelled) setAccessLoading(false)
      }
    }

    void loadPerformanceData()
    return () => { cancelled = true }
  }, [user?.id, quizzes])

  const startQuiz = (quizId: string) => {
    if (!user) {
      handleAuthModalOpen('register')
      return
    }
    if (navigatingRef.current) return
    navigatingRef.current = true
    router.push(`/quiz?id=${quizId}${practiceMode === 'context' ? '&stage=context' : ''}`)
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
      const { error } = await signOut()
      if (error) throw error
      router.replace('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const bankedOptions = useMemo(
    () => quizzes.filter(quiz => quiz.quiz_mode === 'banked' && (quiz.response_mode ?? 'options') === 'options').sort(pathwayOrder),
    [quizzes]
  )

  const bankedTyped = useMemo(
    () => quizzes.filter(quiz => quiz.quiz_mode === 'banked' && quiz.response_mode === 'typed' &&
      Boolean(typedLinks[quiz.id]) && unlockedOptions.has(typedLinks[quiz.id])).sort(pathwayOrder),
    [quizzes, typedLinks, unlockedOptions]
  )

  const SmallQuizCard = ({ quiz, position, suggested }: { quiz: Quiz; position: number; suggested: boolean }) => {
    const guide = getPackGuide(quiz.title)
    const performance = perfByQuiz[quiz.id]
    const accuracy = performance?.bestAccuracy ?? null
    const fluency = performance?.bestFluency ?? null
    const mode = practiceMode === 'context' ? 'Context' : quiz.response_mode === 'typed' ? 'Typed' : 'Options'
    const aim = mode === 'Typed' ? 6 : 15

    let state: 'learning' | 'accurate' | 'fluent' = 'learning'
    let stateLabel = accuracy === null ? 'Not yet practised' : 'Building'
    if (mode === 'Context') { state = 'accurate'; stateLabel = 'Unlocked' }
    else if (accuracy === 100 && (fluency ?? 0) >= aim) {
      state = 'fluent'
      stateLabel = 'Fluent'
    } else if (mode === 'Options' && unlockedOptions.has(quiz.id)) {
      state = 'accurate'
      stateLabel = 'Accuracy ready'
    } else if (accuracy === 100) {
      state = 'accurate'
      stateLabel = 'Accurate'
    }

    return (
      <article className={`bl-quiz-card bl-quiz-card-${state}`} aria-label={`Practice set: ${quiz.title}`}>
        <div className="bl-quiz-card-top">
          <span className={`bl-mode-badge bl-mode-${mode.toLowerCase()}`}>{mode}</span>
          <span className="bl-state-label"><i aria-hidden="true" />{stateLabel}</span>
        </div>

        <div className="bl-pathway-line">
          <span>{guide ? `Suggested order ${position}` : 'More practice'}</span>
          {suggested && <strong>{user ? 'Suggested next' : 'Start here'}</strong>}
        </div>
        <h3>{quiz.title}</h3>
        {(guide?.theme || quiz.description) && <p className="bl-quiz-description">{guide?.theme || quiz.description}</p>}
        {guide && <p className="bl-tasklist-codes">Task-list areas: {guide.codes}</p>}

        <div className="bl-quiz-card-bottom">
          <span className="bl-access-label">Account access</span>
          <button className="bl-button bl-card-action" onClick={() => startQuiz(quiz.id)}>
            {mode === 'Context' ? 'Practice questions' : mode === 'Typed' ? 'Start sprint' : 'Practise options'}
          </button>
        </div>
      </article>
    )
  }

  const PracticeColumn = ({
    mode,
    code,
    title,
    description,
    items,
  }: {
    mode: 'options' | 'typed' | 'context'
    code: string
    title: string
    description: string
    items: Quiz[]
  }) => {
    const guided = items.filter(item => getPackGuide(item.title))
    const hasPerformance = Boolean(user && performanceUserId === user.id)
    const next = !user
      ? guided[0]
      : hasPerformance
        ? guided.find(item => perfByQuiz[item.id]?.bestAccuracy === null)
          ?? guided.find(item => {
            const stats = perfByQuiz[item.id]
            return stats && (stats.bestAccuracy !== 100 || (stats.bestFluency ?? 0) < (mode === 'typed' ? 6 : 15))
          })
          ?? guided[0]
        : undefined

    return (
    <section
      id={`practice-${mode}`}
      className={`bl-practice-column ${practiceMode === mode ? 'bl-mobile-active' : 'bl-mobile-inactive'}`}
      aria-labelledby={`tab-${mode}`}
    >
      <div className="bl-practice-column-head">
        <div>
          <span>{code}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <strong aria-label={`${items.length} practice sets`}>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <div className="bl-column-empty">{mode === 'context' ? accessError ? 'Could not check access. Please reload this page.' : accessLoading ? 'Checking practice-question access…' : 'Meet the options fluency aim for a pack to unlock its practice questions.' : mode === 'typed' ? !user ? 'Sign in to see your unlocked typed sprints.'
          : accessError ? 'Could not check typed access. Please reload this page.'
          : accessLoading ? 'Checking available typed sprints…'
            : 'No typed sprints unlocked yet. Complete the options accuracy pathway for a pack first.'
          : 'No practice sets available yet.'}</div>
      ) : (
        <div className="bl-quiz-list">{items.map((quiz, index) => <SmallQuizCard key={quiz.id} quiz={quiz} position={index + 1} suggested={quiz.id === next?.id} />)}</div>
      )}
    </section>
    )
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const accountInitial = displayName.charAt(0).toUpperCase()

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
      <header className="bl-header bl-category-header">
        <div className="bl-container bl-header-inner">
          <button className="bl-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark" aria-hidden="true">BL</span>
            <span>behavior<span>lingo</span></span>
          </button>

          <div className="bl-header-actions bl-desktop-nav">
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

          <nav className="bl-mobile-nav" aria-label="Mobile navigation">
            {user ? (
              <>
                <button onClick={() => router.push('/')}>Modules</button>
                <button onClick={() => router.push('/progress')}>Progress</button>
                <details className="bl-account-menu">
                  <summary aria-label={`Account menu for ${displayName}`}>{accountInitial}</summary>
                  <div>
                    <span>Signed in as <strong>{displayName}</strong></span>
                    <button onClick={handleSignOut}>Sign out</button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <button onClick={() => handleAuthModalOpen('login')}>Log in</button>
                <button className="bl-mobile-join" onClick={() => handleAuthModalOpen('register')}>Join</button>
              </>
            )}
          </nav>
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
            {quizzes.length > 0 && <p className="bl-pathway-intro">Follow the suggested sequence, or choose any practice set that fits what you want to study now.</p>}
            <div className="bl-category-meta">
              <span><i aria-hidden="true" /> Options aim: 15/min</span>
              <span><i aria-hidden="true" /> Typed aim: 6/min</span>
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
            <>
              <div className="bl-mobile-mode-switch bl-practice-mode-switch" role="tablist" aria-label="Practice mode">
                <button
                  id="tab-options"
                  role="tab"
                  aria-selected={practiceMode === 'options'}
                  aria-controls="practice-options"
                  onClick={() => setPracticeMode('options')}
                >
                  Options <span>{bankedOptions.length}</span>
                </button>
                <button
                  id="tab-typed"
                  role="tab"
                  aria-selected={practiceMode === 'typed'}
                  aria-controls="practice-typed"
                  onClick={() => setPracticeMode('typed')}
                >
                  Typed <span>{bankedTyped.length}</span>
                </button>
                <button id="tab-context" role="tab" aria-selected={practiceMode === 'context'}
                  aria-controls="practice-context" onClick={() => setPracticeMode('context')}>
                  Practice questions <span>{bankedOptions.filter(quiz => contextPacks.has(quiz.id)).length}</span>
                </button>
              </div>
              <div className="bl-practice-columns">
                <PracticeColumn
                  mode="options"
                  code="MODE_01"
                  title="Options practice"
                  description="Build accurate discrimination with response support."
                  items={bankedOptions}
                />
                <PracticeColumn
                  mode="typed"
                  code="MODE_02"
                  title="Typed practice"
                  description="Strengthen independent retrieval without response prompts."
                  items={bankedTyped}
                />
                <PracticeColumn mode="context" code="MODE_03" title="Practice questions"
                  description="Use the terms in timed scenarios. Correct terms leave the option bank as you answer."
                  items={bankedOptions.filter(quiz => contextPacks.has(quiz.id))} />
              </div>
            </>
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
