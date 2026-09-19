'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, supabasePublic } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth/AuthModal'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight } from 'lucide-react'
import { executeAuthQuery } from '@/lib/supabase-utils'

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

  const firstRun = useRef(false)
  const loadPurchasedQuizzesRef = useRef(false)

  useEffect(() => {
    if (window.location.pathname !== '/') return

    try {
      localStorage.removeItem('stripe_payment_intent')
      sessionStorage.removeItem('stripe_payment_intent')
    } catch (error) {
      console.log('Storage cleanup failed:', error)
    }

    if (!firstRun.current) {
      firstRun.current = true
      void loadCategories()
    }

    if (user) void loadPurchasedQuizzes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadPurchasedQuizzes = async () => {
    if (!user || loadPurchasedQuizzesRef.current) return

    loadPurchasedQuizzesRef.current = true

    try {
      const result = await executeAuthQuery(async () => {
        return await supabase
          .from('purchases')
          .select('quiz_id, purchased_at, quizzes:quizzes!purchases_quiz_id_fkey ( id, title, description )')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('purchased_at', { ascending: false })
      }, { maxRetries: 3, retryDelay: 1000 })

      if (result.error) {
        console.error('Error loading purchased quizzes:', result.error)
        setPurchasedQuizzes([])
      } else {
        const typedData = (result.data || []).map((item: any) => ({
          quiz_id: item.quiz_id,
          purchased_at: item.purchased_at,
          quizzes: item.quizzes,
        }))
        setPurchasedQuizzes(typedData)
      }
    } catch (error) {
      console.error('Purchases fetch failed after retries:', error)
      setPurchasedQuizzes([])
    } finally {
      loadPurchasedQuizzesRef.current = false
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
      await signOut()
      setShowMyQuizzes(false)
      setPurchasedQuizzes([])

      try {
        localStorage.clear()
        sessionStorage.clear()
        document.cookie.split(';').forEach((cookie) => {
          document.cookie = cookie
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
        })
      } catch (storageError) {
        console.log('Storage clear error:', storageError)
      }

      setTimeout(() => window.location.replace('/'), 200)
    } catch (error) {
      console.error('Sign out error:', error)
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      window.location.replace('/')
    }
  }

  if (loading || authLoading) {
    return (
      <div className="bl-page bl-loading" role="status" aria-live="polite">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Loading practice environment</p>
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
                <span className="bl-user-label">
                  Signed in as <strong>{user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'learner'}</strong>
                </span>
                <button className="bl-button bl-button-quiet" onClick={() => setShowMyQuizzes(!showMyQuizzes)}>
                  {showMyQuizzes ? 'Browse modules' : `My practice · ${purchasedQuizzes.length}`}
                </button>
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
        {!showMyQuizzes && (
          <>
            <section className="bl-hero">
              <div className="bl-container bl-hero-grid">
                <div className="bl-hero-copy">
                  <p className="bl-kicker">Fluency training for behaviour analysis</p>
                  <h1>Know the terms.<br /><span>Build the fluency.</span></h1>
                  <p className="bl-hero-lede">
                    Precision-designed practice for behaviour analysts who want knowledge that is accurate, rapid and ready when it matters.
                  </p>
                  <div className="bl-hero-actions">
                    <button
                      className="bl-button bl-button-primary"
                      onClick={() => user ? document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' }) : handleAuthModalOpen('register')}
                    >
                      {user ? 'Choose a module' : 'Start building fluency'}
                      <ArrowRight size={17} strokeWidth={2} />
                    </button>
                    {!user && <span className="bl-action-note">Account required to save progress</span>}
                  </div>
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
                    <p>Accuracy, response rate and celeration are graphed across attempts. Predictive modelling helps estimate where performance is heading—not simply where it has been.</p>
                    <div className="bl-feature-tags"><span>Graphs</span><span>Trends</span><span>Projections</span></div>
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
                    <p>Leaderboards and within-session task changes support sustained practice. As a timing advances, higher-effort demands are progressively removed, arranging task relief as a negative-reinforcement contingency.</p>
                    <div className="bl-feature-tags"><span>Leaderboard</span><span>Task shaping</span><span>Reinforcement</span></div>
                  </article>
                </div>
              </div>
            </section>
          </>
        )}

        {user && showMyQuizzes && (
          <section className="bl-dashboard bl-container">
            <div className="bl-page-heading"><p className="bl-kicker">Saved access</p><h1>Your practice</h1><p>Continue where you left off.</p></div>
            {purchasedQuizzes.length === 0 ? (
              <div className="bl-empty-state">
                <span className="bl-empty-code">NO_SAVED_SETS</span><h2>Your practice list is empty.</h2><p>Browse the modules and choose a fluency set to begin.</p>
                <button className="bl-button bl-button-primary" onClick={() => setShowMyQuizzes(false)}>Browse modules <ArrowRight size={17} /></button>
              </div>
            ) : (
              <div className="bl-practice-grid">
                {purchasedQuizzes.map((purchase) => (
                  <article key={purchase.quiz_id} className="bl-practice-card">
                    <span className="bl-card-number">READY</span><h2>{purchase.quizzes?.title}</h2><p>{purchase.quizzes?.description}</p>
                    <span className="bl-card-meta">Added {new Date(purchase.purchased_at).toLocaleDateString()}</span>
                    <button className="bl-button bl-button-primary" onClick={() => startPurchasedQuiz(purchase.quiz_id)}>Continue practice <ArrowRight size={17} /></button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!showMyQuizzes && (
          <section id="modules" className="bl-modules">
            <div className="bl-container">
              <div className="bl-section-heading bl-section-heading-modules">
                <div><p className="bl-kicker">BACB 6th Edition</p><h2>Choose your module.</h2></div>
                <p>Practice by content area in supported options mode or independent typed mode.</p>
              </div>

              {!user && <div className="bl-notice"><span className="bl-notice-mark" aria-hidden="true">i</span><span>Create an account to record attempts and chart your progress over time.</span></div>}

              {categories.length === 0 ? (
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
        )}

        {!showMyQuizzes && (
          <section className="bl-method">
            <div className="bl-container">
              <div className="bl-section-heading">
                <div><p className="bl-kicker">The practice sequence</p><h2>Support accuracy. Then build speed.</h2></div>
                <p>Each mode has a clear job: establish accurate discriminations, strengthen independent retrieval and make change visible across attempts.</p>
              </div>
              <div className="bl-method-grid">
                <article className="bl-method-card"><span className="bl-card-number">01</span><h3>Begin with options</h3><p>Supported responding helps establish accurate term–definition relations without turning early errors into practice.</p></article>
                <article className="bl-method-card"><span className="bl-card-number">02</span><h3>Move to typed recall</h3><p>Independent retrieval increases response effort and tests whether the vocabulary is genuinely available.</p></article>
                <article className="bl-method-card"><span className="bl-card-number">03</span><h3>Repeat to fluency</h3><p>Timed practice and performance graphs show whether accurate responding is becoming rapid and durable.</p></article>
              </div>
            </div>
          </section>
        )}

        {!showMyQuizzes && (
          <section className="bl-credibility">
            <div className="bl-container bl-credibility-inner">
              <p className="bl-kicker">Built from behavioural science</p>
              <h2>Serious practice. Clear feedback. No gimmicks.</h2>
              <p>BehaviorLingo is created by Dr Richard May, BCBA-D and Associate Professor of Behaviour Analysis, to bring fluency-based learning into everyday professional study.</p>
              <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">About Dr May <ArrowRight size={16} /></a>
            </div>
          </section>
        )}
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} onSwitchMode={(newMode: 'login' | 'register' | 'reset') => setAuthMode(newMode)} />

      <footer className="bl-footer">
        <div className="bl-container bl-footer-inner">
          <div><div className="bl-footer-wordmark">behavior<span>lingo</span></div><p>Fluency training for behaviour analysis.</p></div>
          <div className="bl-footer-links">
            <button onClick={() => router.push('/about')}>About</button><button onClick={() => router.push('/privacy')}>Privacy</button><button onClick={() => router.push('/terms')}>Terms</button>
            <a href="https://richardjmay.github.io/" target="_blank" rel="noopener noreferrer">Dr May</a>
          </div>
          <span className="bl-copyright">© 2026 BehaviorLingo</span>
        </div>
      </footer>
    </div>
  )
}
