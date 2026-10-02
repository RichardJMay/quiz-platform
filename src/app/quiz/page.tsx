'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import QuizTakerBanked from '@/components/QuizTakerBanked'
import QuizTakerBankedTyped from '@/components/QuizTakerBankedTyped'
import AdaptiveBaseline from '@/components/AdaptiveBaseline'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/auth/AuthModal'
import Link from 'next/link'
import { loadPathwayAttempts } from '@/lib/pathway-client'
import { accuracyGate } from '@/lib/learning-stage'

type ResponseMode = 'options' | 'typed' | null

function QuizLoader() {
  const searchParams = useSearchParams()
  const quizId = searchParams.get('id')
  const contextPractice = searchParams.get('stage') === 'context'
  const { user } = useAuth()

  const [responseMode, setResponseMode] = useState<ResponseMode>(null)
  const [adaptiveActive, setAdaptiveActive] = useState(false)
  const [loadedQuizId, setLoadedQuizId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchMode = async () => {
      setLoading(true)
      setResponseMode(null)
      setAdaptiveActive(false)
      if (!quizId) {
        setLoading(false)
        setLoadedQuizId(null)
        return
      }
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('quiz_mode, response_mode')
          .eq('id', quizId)
          .eq('is_listed', true)
          .single()

        if (cancelled) return
        if (error || !data || data.quiz_mode !== 'banked') {
          setResponseMode(null)
        } else {
          const mode = (data.response_mode as ResponseMode) ?? 'options'
          if (mode === 'options' && !contextPractice) {
            const { data: settings, error: settingsError } = await supabase
              .from('adaptive_pack_settings').select('enabled').eq('quiz_id', quizId).maybeSingle()
            if (settingsError) throw settingsError
            if (settings?.enabled) {
              if (!user) throw new Error('Sign in required')
              const history = await loadPathwayAttempts(user.id, quizId)
              const alreadyFluent = history.adaptiveFluencyUnlocked ||
                history.recognisedEarlierTimings || accuracyGate(history.attempts).met
              if (!cancelled) setAdaptiveActive(!alreadyFluent)
            }
          }
          if (!cancelled) setResponseMode(mode)
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setResponseMode(null)
        }
      } finally {
        if (!cancelled) {
          setLoadedQuizId(quizId)
          setLoading(false)
        }
      }
    }

    void fetchMode()
    return () => { cancelled = true }
  }, [quizId, user?.id, contextPractice])

  if (loading || loadedQuizId !== quizId) {
    return (
      <div className="bl-page bl-loading min-h-screen">
        <div className="bl-loader" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <p className="bl-kicker">Preparing fluency session</p>
      </div>
    )
  }

  if (!responseMode) {
    return <div className="bl-page bl-quiz-signin"><main className="bl-container">
      <p className="bl-kicker">BehaviorLingo practice</p>
      <h1>Practice set unavailable.</h1>
      <p>Choose a listed fluency pack from the modules.</p>
      <Link className="bl-back-link" href="/">Back to modules</Link>
    </main></div>
  }

  if (contextPractice && responseMode === 'typed') return <p>Practice questions use the options pack.</p>
  if (contextPractice) return <QuizTakerBanked key={`${quizId}:context`} contextPractice />
  if (responseMode === 'options' && quizId && adaptiveActive) {
    return <AdaptiveBaseline quizId={quizId} />
  }
  return responseMode === 'typed' ? <QuizTakerBankedTyped /> : <QuizTakerBanked key={`${quizId}:definitions`} />
}

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')

  if (authLoading) {
    return (
      <div className="bl-page bl-loading" role="status" aria-live="polite">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Checking your account</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bl-page bl-quiz-signin">
        <main className="bl-container">
          <p className="bl-kicker">BehaviorLingo practice</p>
          <h1>Sign in to practise.</h1>
          <p>Your account keeps your attempts and progress together.</p>
          <div className="bl-hero-actions">
            <button className="bl-button bl-button-primary" onClick={() => { setAuthMode('login'); setAuthModalOpen(true) }}>Log in</button>
            <button className="bl-button" onClick={() => { setAuthMode('register'); setAuthModalOpen(true) }}>Create account</button>
          </div>
          <Link className="bl-back-link" href="/">Back to modules</Link>
        </main>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          mode={authMode}
          onSwitchMode={setAuthMode}
        />
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="bl-page bl-loading min-h-screen">
          <div className="bl-loader" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <p className="bl-kicker">Preparing fluency session</p>
        </div>
      }
    >
      <QuizLoader />
    </Suspense>
  )
}
