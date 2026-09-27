'use client'

import { useEffect, useState } from 'react'
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
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('quiz_id')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10)

        if (attemptsError) throw attemptsError
        if (!attempts?.length) return

        const { data: available, error: quizzesError } = await supabasePublic
          .from('quizzes')
          .select('id, title, quiz_mode')
          .in('id', [...new Set(attempts.map(attempt => attempt.quiz_id))])
          .eq('is_listed', true)

        if (quizzesError) throw quizzesError
        const banked = new Map((available ?? [])
          .filter(quiz => quiz.quiz_mode === 'banked')
          .map(quiz => [quiz.id, quiz.title]))
        const recent = attempts.find(attempt => banked.has(attempt.quiz_id))
        if (!cancelled && recent) {
          setContinueQuiz({ id: recent.quiz_id, title: banked.get(recent.quiz_id)! })
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
                        ? router.push(`/quiz?id=${encodeURIComponent(continueQuiz.id)}`)
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
                <p>BehaviorLingo combines measurement, fluency-building and designed contingencies in one practice environment.</p>
              </div>
              <div className="bl-feature-grid">
                <article className="bl-feature-card">
                  <span className="bl-feature-code">01 / PERFORMANCE</span>
                  <h3>See the learning curve.</h3>
                  <p>Review your quiz accuracy and response rate over time, and see how your practice is changing.</p>
                  <div className="bl-feature-tags"><span>Graphs</span><span>Progress</span><span>Feedback</span></div>
                </article>
                <article className="bl-feature-card">
                  <span className="bl-feature-code">02 / FLUENCY</span>
                  <h3>Practise beyond correct.</h3>
                  <p>Learning continues beyond the first accurate response. Repeated retrieval and overlearning build responding that is faster, more stable and more resistant to forgetting.</p>
                  <div className="bl-feature-tags"><span>Accuracy</span><span>Rate</span><span>Retention</span></div>
                </article>
                <article className="bl-feature-card">
                  <span className="bl-feature-code">03 / CONTINGENCIES</span>
                  <h3>Make progress consequential.</h3>
                  <p>Short practice sessions and clear feedback help you return to the terms that need more work.</p>
                  <div className="bl-feature-tags"><span>Practice</span><span>Review</span><span>Feedback</span></div>
                </article>
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
            <button onClick={() => router.push('/privacy')}>Privacy</button><button onClick={() => router.push('/terms')}>Terms</button>
            <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">Dr May</a>
          </div>
          <span className="bl-copyright">© 2026 BehaviorLingo</span>
        </div>
      </footer>
    </div>
  )
}
