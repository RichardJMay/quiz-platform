'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, supabasePublic } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string
  icon_name: string
  color_class: string
  quizzes: { count: number }[]
}

interface ContinueQuiz {
  id: string
  title: string
  context?: boolean
}

export default function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [continueQuiz, setContinueQuiz] = useState<ContinueQuiz | null>(null)
  const [continueLoading, setContinueLoading] = useState(false)
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()

  useEffect(() => {
    void loadCategories()
  }, [])

  useEffect(() => {
    let cancelled = false
    setContinueQuiz(null)

    if (!user) {
      setContinueLoading(false)
      return
    }

    setContinueLoading(true)
    const loadContinueQuiz = async () => {
      try {
        const [attemptResult, sessionResult, trialResult, contextResult] = await Promise.all([
          supabase.from('quiz_attempts').select('quiz_id, completed_at')
            .eq('user_id', user.id).order('completed_at', { ascending: false }).limit(10),
          supabase.from('adaptive_sessions').select('id, quiz_id, started_at, completed_at')
            .eq('user_id', user.id).order('started_at', { ascending: false }).limit(10),
          supabase.from('adaptive_trials').select('session_id, answered_at')
            .eq('user_id', user.id).order('answered_at', { ascending: false }).limit(10),
          supabase.from('context_practice_attempts').select('quiz_id, completed_at')
            .eq('user_id', user.id).order('completed_at', { ascending: false }).limit(10),
        ])
        const { data: attempts, error: attemptsError } = attemptResult
        const { data: sessions, error: sessionsError } = sessionResult
        const { data: trials, error: trialsError } = trialResult
        if (attemptsError) throw attemptsError
        if (sessionsError) throw sessionsError
        if (trialsError) throw trialsError
        if (contextResult.error) throw contextResult.error
        const latestAnswer = new Map<string, string>()
        for (const trial of trials || []) {
          if (!latestAnswer.has(trial.session_id)) latestAnswer.set(trial.session_id, trial.answered_at)
        }
        const candidates = [
          ...(attempts || []).map(row => ({ quizId: row.quiz_id, at: row.completed_at || '', context: false })),
          ...(contextResult.data || []).map(row => ({ quizId: row.quiz_id, at: row.completed_at || '', context: true })),
          ...(sessions || []).map(row => ({ quizId: row.quiz_id, context: false,
            at: [row.started_at, row.completed_at, latestAnswer.get(row.id)]
              .filter((value): value is string => Boolean(value)).sort().at(-1)! })),
        ].filter(row => row.at).sort((a, b) => b.at.localeCompare(a.at))
        if (!candidates.length) return

        const { data: available, error: quizzesError } = await supabasePublic
          .from('quizzes')
          .select('id, title, quiz_mode')
          .in('id', [...new Set(candidates.map(candidate => candidate.quizId))])
          .eq('is_listed', true)

        if (quizzesError) throw quizzesError
        const banked = new Map((available ?? [])
          .filter(quiz => quiz.quiz_mode === 'banked')
          .map(quiz => [quiz.id, quiz.title]))
        const recent = candidates.find(candidate => banked.has(candidate.quizId))
        if (!cancelled && recent) {
          setContinueQuiz({ id: recent.quizId, title: banked.get(recent.quizId)!, context: recent.context })
        }
      } catch (error) {
        console.error('Could not load recent practice:', error)
      } finally {
        if (!cancelled) setContinueLoading(false)
      }
    }

    void loadContinueQuiz()
    return () => { cancelled = true }
  }, [user?.id])

  const loadCategories = async () => {
    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort('timeout'), 8000)

    try {
      const { data, error } = await supabasePublic
        .from('quiz_categories')
        .select(`
          *,
          quizzes(count)
        `)
        .eq('is_active', true)
        .eq('quizzes.is_listed', true)
        .order('display_order')
        .abortSignal(ac.signal)

      if (error) throw error
      setCategories(data ?? [])
    } catch (error) {
      setCategories([])
      console.error('Categories fetch failed:', error)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    router.push(`/category?id=${categoryId}&name=${encodeURIComponent(categoryName)}`)
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

  return (
    <div className="bl-page">
      <header className="bl-header">
        <div className="bl-container bl-header-inner">
          <button className="bl-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark" aria-hidden="true">BL</span>
            <span>behavior<span>lingo</span></span>
          </button>

          <div className="bl-header-actions">
            {authLoading ? (
              <div className="bl-header-skeleton" role="status" aria-label="Checking sign-in">
                <span className="bl-skeleton-bar" />
                <span className="bl-skeleton-bar" />
              </div>
            ) : user ? (
              <>
                <span className="bl-user-label">
                  Signed in as <strong>{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'learner'}</strong>
                </span>
                <button className="bl-button bl-button-quiet" onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}>Browse modules</button>
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

      <main>
        <section className="bl-hero">
              <div className="bl-container bl-hero-grid">
                <div className="bl-hero-copy">
                  <p className="bl-kicker">Fluency training for behaviour analysis</p>
                  <h1>Know the terms.<br /><span>Build your fluency.</span></h1>
                  <p className="bl-hero-lede">
                    Precision-designed practice for behaviour analysts who want knowledge that is accurate, rapid and ready when it matters.
                  </p>
                  <div className="bl-hero-actions">
                    <button
                      className="bl-button bl-button-primary"
                      onClick={() => continueQuiz
                        ? router.push(`/quiz?id=${encodeURIComponent(continueQuiz.id)}${continueQuiz.context ? '&stage=context' : ''}`)
                        : document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      {continueQuiz ? 'Continue practice' : 'Explore modules'}
                      <ArrowRight size={17} strokeWidth={2} />
                    </button>
                    {continueQuiz && (
                      <button className="bl-hero-browse" onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}>
                        Choose another quiz
                      </button>
                    )}
                  </div>
                  <p className="bl-action-note" aria-live="polite">
                    {continueQuiz ? `Your most recent practice: ${continueQuiz.title}` : continueLoading ? 'Finding your recent practice…' : 'Choose a content area to begin'}
                  </p>
                  <div className="bl-proof-line" aria-label="Product features">
                    <span>Accuracy</span><i aria-hidden="true" /><span>Fluency</span><i aria-hidden="true" /><span>Retention</span>
                  </div>
                </div>

                <div className="bl-terminal-wrap" aria-label="Example BehaviorLingo practice display">
                  <div className="bl-terminal-shadow" aria-hidden="true" />
                  <div className="bl-terminal">
                    <div className="bl-terminal-top"><span>FLUENCY_SESSION</span><span>01:00</span></div>
                    <div className="bl-terminal-screen">
                      <span className="bl-screen-label">TERM_014</span>
                      <p>Reinforcement</p>
                      <div className="bl-screen-rule" />
                      <dl>
                        <div><dt>Accuracy</dt><dd>96%</dd></div>
                        <div><dt>Rate</dt><dd>14.2 / min</dd></div>
                        <div><dt>Status</dt><dd className="bl-status-ready">Building</dd></div>
                      </dl>
                    </div>
                    <div className="bl-terminal-foot"><span>Respond accurately</span><span>Then respond fluently</span></div>
                  </div>
                </div>
              </div>
        </section>

        <section id="modules" className="bl-modules">
            <div className="bl-container">
              <div className="bl-section-heading bl-section-heading-modules">
                <div><p className="bl-kicker">BACB 6th Edition</p><h2>Choose your module.</h2></div>
                <p>Practice by content area in supported options mode or independent typed mode.</p>
              </div>

              {!authLoading && !user && <div className="bl-notice"><span className="bl-notice-mark" aria-hidden="true">i</span><span>Create an account to record attempts and chart your progress over time.</span></div>}

              {loading ? (
                <div className="bl-module-grid" role="status" aria-live="polite">
                  <span className="sr-only">Loading modules</span>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="bl-module-card bl-module-skeleton" aria-hidden="true">
                      <span className="bl-skeleton-bar" />
                      <span className="bl-skeleton-bar" />
                      <span className="bl-skeleton-bar" />
                    </div>
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="bl-empty-state"><span className="bl-empty-code">CONTENT_LOADING</span><h2>New modules are in preparation.</h2><p>More behaviour-analytic fluency content is coming soon.</p></div>
              ) : (
                <div className="bl-module-grid">
                  {categories.map((category, index) => {
                    const quizCount = category.quizzes?.[0]?.count || 0
                    return (
                      <button key={category.id} onClick={() => handleCategoryClick(category.id, category.name)} className="bl-module-card">
                        <span className="bl-module-index">AREA_{String(index + 1).padStart(2, '0')}</span>
                        <h3>{category.name}</h3><p>{category.description}</p>
                        <span className="bl-module-bottom"><span>{quizCount} {quizCount === 1 ? 'practice set' : 'practice sets'}</span><ArrowRight size={19} strokeWidth={2} /></span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
        </section>

        <section className="bl-features">
            <div className="bl-container">
              <div className="bl-section-heading">
                <div><p className="bl-kicker">What makes it different</p><h2>A learning system, not just a term bank.</h2></div>
                <p>Build accuracy with support, develop fluency, then practise using the terms in context across all 33 current packs.</p>
              </div>
              <div className="bl-feature-grid">
                <Link className="bl-feature-card bl-feature-link" href="/how-it-works#accuracy">
                  <span className="bl-feature-code">01 / ACCURACY FIRST</span>
                  <h3>Learn what needs work.</h3>
                  <p>Start with a check of every term. Adaptive practice focuses on the terms that need attention, with familiar items mixed in for review.</p>
                  <div className="bl-feature-tags"><span>Baseline</span><span>Targeted practice</span></div>
                  <span className="bl-feature-more">How accuracy practice works <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
                <Link className="bl-feature-card bl-feature-link" href="/how-it-works#support">
                  <span className="bl-feature-code">02 / SUPPORT TO INDEPENDENCE</span>
                  <h3>Help when you need it.</h3>
                  <p>Use fewer options or study an example alongside the definition. Later answers without help show which terms you can identify independently.</p>
                  <div className="bl-feature-tags"><span>Study examples</span><span>Independent checks</span></div>
                  <span className="bl-feature-more">How support and readiness work <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
                <Link className="bl-feature-card bl-feature-link" href="/how-it-works#fluency">
                  <span className="bl-feature-code">03 / FLUENCY AND PROGRESS</span>
                  <h3>Build speed. See progress.</h3>
                  <p>Once accuracy is established, practise in short timed sessions. Track accuracy and response rate separately for options and typed answers.</p>
                  <div className="bl-feature-tags"><span>Timed practice</span><span>Learning records</span></div>
                  <span className="bl-feature-more">How fluency is tracked <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </div>
            </div>
        </section>

        <section className="bl-credibility">
            <div className="bl-container bl-credibility-inner">
              <p className="bl-kicker">Built from behavioural science</p>
              <h2>Serious practice. Clear feedback. No gimmicks.</h2>
              <p>BehaviorLingo is created by Dr Richard May, BCBA-D and Associate Professor of Behaviour Analysis, to bring fluency-based learning into everyday professional study.</p>
              <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">About Dr May <ArrowRight size={16} /></a>
            </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} onSwitchMode={(newMode: 'login' | 'register' | 'reset') => setAuthMode(newMode)} />

      <footer className="bl-footer">
        <div className="bl-container bl-footer-inner">
          <div><div className="bl-footer-wordmark">behavior<span>lingo</span></div><p>Fluency training for behaviour analysis.</p></div>
          <div className="bl-footer-links">
            <Link href="/how-it-works">How it works</Link><button onClick={() => router.push('/privacy')}>Privacy</button><button onClick={() => router.push('/terms')}>Terms</button>
            <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">Dr May</a>
          </div>
          <span className="bl-copyright">© 2026 BehaviorLingo</span>
        </div>
      </footer>
    </div>
  )
}
