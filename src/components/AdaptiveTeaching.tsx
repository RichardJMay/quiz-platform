'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type TeachingView =
  | { status: 'in_progress'; sessionId: string; ordinal: number; answered: number;
      total: number; ready: number; terms: number; definition: string;
      example: string | null; supportLevel: 0 | 1 | 2;
      options: { id: string; text: string }[] }
  | { status: 'completed'; sessionId: string; correct: number; answered: number;
      ready: number; terms: number; unlocked: boolean }
  | { status: 'unlocked' }

type Feedback = { status: 'feedback'; correct: boolean; correctTerm: string; next: TeachingView }

export default function AdaptiveTeaching({ quizId, title }: { quizId: string; title: string }) {
  const router = useRouter()
  const [view, setView] = useState<TeachingView | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const sending = useRef(false)
  const displayedAt = useRef(0)

  const begin = async () => {
    setBusy(true)
    setError('')
    try {
      const { data, error: startError } = await supabase.rpc('adaptive_begin_teaching', {
        p_quiz_id: quizId,
      })
      if (startError) throw startError
      setView(data as TeachingView)
      setFeedback(null)
      setSelected(null)
      displayedAt.current = performance.now()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start learning set')
    } finally { setBusy(false) }
  }

  useEffect(() => { void begin() /* Start or resume on entry. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  const askForHelp = async (level: 1 | 2) => {
    if (sending.current || view?.status !== 'in_progress' || feedback) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const { data, error: helpError } = await supabase.rpc('adaptive_choose_help', {
        p_session_id: view.sessionId, p_ordinal: view.ordinal, p_level: level,
      })
      if (helpError) throw helpError
      setView(data as TeachingView)
      setSelected(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not show help')
    } finally { sending.current = false; setBusy(false) }
  }

  const answer = async (termId: string | null, dontKnow: boolean) => {
    if (sending.current || view?.status !== 'in_progress' || feedback) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const { data, error: saveError } = await supabase.rpc('adaptive_answer_teaching', {
        p_session_id: view.sessionId, p_ordinal: view.ordinal,
        p_selected_term_id: termId, p_dont_know: dontKnow,
        p_latency_ms: Math.min(1800000, Math.max(0, Math.round(performance.now() - displayedAt.current))),
      })
      if (saveError) throw saveError
      setFeedback(data as Feedback)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save response. Please retry.')
    } finally { sending.current = false; setBusy(false) }
  }

  const continueAfterFeedback = () => {
    if (!feedback) return
    setView(feedback.next)
    setFeedback(null)
    setSelected(null)
    displayedAt.current = performance.now()
  }

  return <div className="bl-page bl-session-page">
    <header className="bl-session-topbar"><div className="bl-session-shell bl-session-topbar-inner">
      <div className="bl-session-title"><span>Learn the terms</span><strong>{title}</strong></div>
      <button type="button" onClick={() => router.push('/')} className="bl-session-exit">Exit and resume later</button>
    </div></header>
    <main className="bl-session-shell bl-workspace">
      {!view && <section className="bl-question-panel"><h1>{busy ? 'Preparing your learning set…' : 'Could not load learning set'}</h1>
        {error && <p role="alert">{error}</p>}
        {!busy && <button className="bl-button" onClick={() => void begin()}>Try again</button>}
      </section>}
      {view?.status === 'unlocked' && <section className="bl-question-panel">
        <p className="bl-kicker">Accuracy complete</p><h1>Fluency practice is unlocked.</h1>
        <p>You have shown independent knowledge of every term in two completed sessions.</p>
        <button className="bl-button" onClick={() => router.push('/')}>Return to modules <span>→</span></button>
      </section>}
      {view?.status === 'completed' && <section className="bl-question-panel">
        <p className="bl-kicker">Learning set complete</p>
        <h1>{view.ready} of {view.terms} terms ready</h1>
        <p>{view.correct} of {view.answered} responses correct in this set.
          {view.unlocked ? ' Fluency practice is unlocked.' : ' A term needs correct answers without help in two completed sessions to count as ready.'}</p>
        <div className="bl-response-actions">
          {!view.unlocked && <button className="bl-button" onClick={() => void begin()} disabled={busy}>
            {busy ? 'Preparing…' : 'Start another learning set'} <span>→</span>
          </button>}
          <button className="bl-hint-toggle" onClick={() => router.push('/')}>Return to modules</button>
        </div>
      </section>}
      {view?.status === 'in_progress' && <>
        <section className="bl-live-status bl-adaptive-status"><div className="bl-live-metrics">
          <div><span>Definition</span><strong>{view.answered + 1} / {view.total}</strong></div>
          <div><span>Terms ready</span><strong>{view.ready} / {view.terms}</strong></div>
        </div><p className="bl-adaptive-note">Answer each term without help in two completed sets to make it ready. You can use help whenever you need it.</p></section>
        <section className="bl-question-panel">
          <div className="bl-question-label"><span>Definition</span><b>{String(view.ordinal + 1).padStart(2, '0')}</b></div>
          <h1>{view.definition}</h1>
          {view.example && <div className="bl-hint-panel bl-adaptive-example"><strong>Example in context</strong><p>{view.example}</p></div>}
          <div className="bl-option-bank" aria-label="Term options">
            {view.options.map(term => <button key={term.id} type="button" disabled={busy || Boolean(feedback)}
              className={`bl-term-option ${selected === term.id ? 'is-selected' : ''}`}
              aria-pressed={selected === term.id} onClick={() => setSelected(term.id)}>{term.text}</button>)}
          </div>
          {!feedback && view.supportLevel < 2 && <div className="bl-help-tools bl-adaptive-help">
            <p className="bl-adaptive-help-label">Need a hand?</p>
            {view.supportLevel === 0 && <button className="bl-hint-toggle" disabled={busy}
              onClick={() => void askForHelp(1)}>Fewer options</button>}
            {view.supportLevel < 2 && <button className="bl-hint-toggle" disabled={busy}
              onClick={() => void askForHelp(2)}>Example + fewer options</button>}
          </div>}
          {feedback && <div className={`bl-feedback ${feedback.correct ? 'is-correct' : 'is-incorrect'}`}>
            <span>{feedback.correct ? 'Correct response' : 'Not quite'}</span>
            <strong>{feedback.correctTerm}</strong>
          </div>}
          {error && <p role="alert">{error}</p>}
          <div className="bl-response-actions bl-adaptive-actions">
            {feedback ? <button className="bl-button" onClick={continueAfterFeedback}>Continue <span>→</span></button> : <>
              <button className="bl-button" disabled={busy || !selected} onClick={() => void answer(selected, false)}>
                {busy ? 'Saving…' : 'Submit answer'} <span>→</span>
              </button>
              <button className="bl-hint-toggle" disabled={busy} onClick={() => void answer(null, true)}>I don’t know</button>
            </>}
          </div>
        </section>
      </>}
    </main>
  </div>
}
