'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdaptiveTeaching from '@/components/AdaptiveTeaching'

type BaselineView =
  | { status: 'in_progress'; sessionId: string; ordinal: number; answered: number;
      total: number; definition: string; options: { id: string; text: string }[] }
  | { status: 'completed'; sessionId: string; total: number; correct: number }

type PackSummary = { totalTerms: number; readyTerms: number }

function ReadinessComparison({ baseline, summary }: {
  baseline: Extract<BaselineView, { status: 'completed' }>
  summary: PackSummary
}) {
  const width = 520
  const height = 310
  const top = 36
  const bottom = 252
  const plotHeight = bottom - top
  const max = Math.max(1, summary.totalTerms)
  const y = (value: number) => bottom - Math.min(max, value) / max * plotHeight
  const ticks = [...new Set([0, Math.round(max / 4), Math.round(max / 2), Math.round(3 * max / 4), max])]
  const bars = [
    { x: 123, value: baseline.correct, label: 'Original baseline', color: '#b4683a' },
    { x: 328, value: summary.readyTerms, label: 'Ready now', color: '#2f6f4e' },
  ]
  return <div className="bl-readiness-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`Original baseline: ${baseline.correct} correct out of ${baseline.total} terms assessed. Currently ${summary.readyTerms} of ${summary.totalTerms} terms ready.`}>
      {ticks.map(tick => <g key={tick}>
        <line x1="62" x2="488" y1={y(tick)} y2={y(tick)} stroke="#9aaa83" strokeWidth="1" />
        <text x="48" y={y(tick) + 5} textAnchor="end" className="bl-chart-tick">{tick}</text>
      </g>)}
      {bars.map(bar => <g key={bar.label}>
        <rect x={bar.x} y={y(bar.value)} width="75" height={bottom - y(bar.value)} fill={bar.color} />
        <text x={bar.x + 37.5} y={Math.max(26, y(bar.value) - 9)} textAnchor="middle"
          className="bl-readiness-value">{bar.value}</text>
        <text x={bar.x + 37.5} y="281" textAnchor="middle" className="bl-chart-axis">{bar.label}</text>
      </g>)}
      <text x="10" y="145" transform="rotate(-90 10 145)" textAnchor="middle" className="bl-chart-axis">Terms</text>
    </svg>
    <p>The baseline assessed {baseline.total} terms. Readiness counts terms answered without help in two completed sets and ready now.
      {baseline.total !== summary.totalTerms ? ` The pack currently contains ${summary.totalTerms} terms.` : ''}</p>
  </div>
}

export default function AdaptiveBaseline({ quizId }: { quizId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('Options baseline')
  const [view, setView] = useState<BaselineView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [learning, setLearning] = useState(false)
  const [summary, setSummary] = useState<PackSummary | null>(null)
  const [summaryError, setSummaryError] = useState(false)
  const sending = useRef(false)
  const displayedAt = useRef(0)

  useEffect(() => {
    let active = true
    const begin = async () => {
      setBusy(true)
      setView(null)
      setError('')
      const [{ data: quiz }, { data, error: startError }] = await Promise.all([
        supabase.from('quizzes').select('title').eq('id', quizId).single(),
        supabase.rpc('adaptive_begin_baseline', { p_quiz_id: quizId }),
      ])
      if (!active) return
      if (startError) setError(startError.message)
      else {
        setTitle(quiz?.title || 'Options baseline')
        setView(data as BaselineView)
        displayedAt.current = performance.now()
      }
      setBusy(false)
    }
    void begin().catch((cause) => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Could not start baseline'); setBusy(false) }
    })
    return () => { active = false }
  }, [quizId])

  useEffect(() => {
    const completedView = view
    if (completedView?.status !== 'completed') return
    let active = true
    const loadSummary = async () => {
      setSummary(null)
      setSummaryError(false)
      const [terms, states] = await Promise.all([
        supabase.from('active_quiz_terms').select('id').eq('quiz_id', quizId),
        supabase.from('adaptive_term_state').select('term_id').eq('quiz_id', quizId).not('certified_at', 'is', null),
      ])
      if (terms.error) throw terms.error
      if (states.error) throw states.error
      if (active) setSummary({ totalTerms: terms.data?.length ?? completedView.total, readyTerms: (states.data || []).filter(state => (terms.data || []).some(term => term.id === state.term_id)).length })
    }
    void loadSummary().catch(error => {
      console.error('Could not load pack readiness:', error)
      if (active) setSummaryError(true)
    })
    return () => { active = false }
  }, [quizId, view?.status, view?.sessionId])

  const answer = async (termId: string | null, dontKnow: boolean) => {
    if (sending.current || view?.status !== 'in_progress') return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const { data, error: saveError } = await supabase.rpc('adaptive_answer_baseline', {
        p_session_id: view.sessionId,
        p_ordinal: view.ordinal,
        p_selected_term_id: termId,
        p_dont_know: dontKnow,
        p_latency_ms: Math.min(1800000, Math.max(0, Math.round(performance.now() - displayedAt.current))),
      })
      if (saveError) throw saveError
      setView(data as BaselineView)
      setSelected(null)
      displayedAt.current = performance.now()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save response. Please retry.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  if (learning) return <AdaptiveTeaching quizId={quizId} title={title} />

  if (!view) return <div className="bl-page bl-session-page"><main className="bl-session-shell bl-start-wrap">
    <section className="bl-start-panel"><div className="bl-start-copy">
      <h1>{busy ? 'Preparing your baseline…' : 'Could not start baseline'}</h1>
      {error && <p role="alert">{error}</p>}
    </div></section>
  </main></div>

  return <div className="bl-page bl-session-page">
    <header className="bl-session-topbar"><div className="bl-session-shell bl-session-topbar-inner">
      <div className="bl-session-title"><span>Options baseline</span><strong>{title}</strong></div>
      <button type="button" onClick={() => router.push('/')} className="bl-session-exit">Exit and resume later</button>
    </div></header>
    <main className="bl-session-shell bl-workspace">
      {view.status === 'completed' ? <section className="bl-question-panel">
        <p className="bl-kicker">Your options pathway</p>
        <h1>{title}: your progress</h1>
        {summary ? <ReadinessComparison baseline={view} summary={summary} />
          : summaryError ? <p role="alert">Could not load your current term readiness. Your baseline was {view.correct} of {view.total}; try reloading this page.</p>
            : <p>Loading your current term readiness…</p>}
        <p>Continue with a short learning set, or return later. Your progress is saved.</p>
        <div className="bl-response-actions">
          <button className="bl-button" onClick={() => setLearning(true)}>Start a learning set <span>→</span></button>
          <button className="bl-hint-toggle" onClick={() => router.push('/')}>Return to modules</button>
        </div>
      </section> : <>
        <section className="bl-live-status"><div className="bl-live-metrics">
          <div><span>Definition</span><strong>{view.answered + 1} / {view.total}</strong></div>
        </div><p>Choose the matching term. You will see your results when the baseline is complete.</p></section>
        <section className="bl-question-panel">
          <div className="bl-question-label"><span>Definition</span><b>{String(view.ordinal + 1).padStart(2, '0')}</b></div>
          <h1>{view.definition}</h1>
          <div className="bl-option-bank" aria-label="Term options">
            {view.options.map((term) => <button key={term.id} type="button"
              className={`bl-term-option ${selected === term.id ? 'is-selected' : ''}`}
              aria-pressed={selected === term.id} disabled={busy}
              onClick={() => setSelected(term.id)}>{term.text}</button>)}
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="bl-response-actions">
            <button type="button" className="bl-button" disabled={busy || !selected}
              onClick={() => void answer(selected, false)}>{busy ? 'Saving…' : 'Submit answer'} <span>→</span></button>
            <button type="button" className="bl-hint-toggle" disabled={busy}
              onClick={() => void answer(null, true)}>I don’t know</button>
          </div>
        </section>
      </>}
    </main>
  </div>
}
