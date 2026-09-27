'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import stateSpaceBundleJson from './behaviorlingo_state_space_posterior_bundle_v3.json'
import { AccuracyByAttempt, CumulativeRecord } from './PathwayCharts'
import { completedAttempts, cumulativeRecord, dayKey, fluencyPoints, type ProgressAttempt } from './progress-records'
import { recognisesEarlierTimings } from '@/lib/learning-stage'
import {
  forecastNextAttempt,
  filterObservedFluency,
  type AttemptObservation,
  type ObservedFluencyTrajectory,
  type StateSpacePosteriorBundleV3,
} from './behaviorlingo-state-space-v3'

type ResponseMode = 'options' | 'typed'

interface QuizAttempt extends ProgressAttempt {
  student_name: string
}

interface ObservedPoint {
  attempt: number
  rate: number
  accuracy: number
  date: string
  dailyProbe: boolean
}

const STATE_SPACE_BUNDLE =
  stateSpaceBundleJson as unknown as StateSpacePosteriorBundleV3
const ACCURACY_AIM = 100
const FLUENCY_AIMS: Record<ResponseMode, number> = { options: 15, typed: 6 }
const EXCLUDED_ATTEMPT_IDS = new Set([
  '157f465a-957c-46bf-b523-0b56134d5118',
  '163bbf23-690b-4530-961d-c1d2edb702b2',
])

const daysBetween = (later: Date, earlier: Date) =>
  Math.max(0, (later.getTime() - earlier.getTime()) / 86_400_000)
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))

function eligibleAttempts(attempts: QuizAttempt[]): QuizAttempt[] {
  return fluencyPoints(attempts).filter(point => point.dailyProbe).map(point => point.attempt as QuizAttempt)
    .filter(attempt => {
      const questions = Number(attempt.total_questions)
      const correct = Number(attempt.correct_answers)
      const minutes = Number(attempt.total_time_minutes)
      return !EXCLUDED_ATTEMPT_IDS.has(attempt.id) && questions > 0 &&
        correct >= 0 && correct <= questions && minutes > 0 && minutes <= 30 &&
        Boolean(attempt.completed_at)
    })
    .slice()
    .sort((first, second) => {
      const difference = new Date(first.completed_at).getTime() -
        new Date(second.completed_at).getTime()
      return difference || first.id.localeCompare(second.id)
    })
}

function toStateSpaceHistory(attempts: QuizAttempt[]): AttemptObservation[] {
  const chronological = eligibleAttempts(attempts)
  return chronological.map((attempt, index) => {
    const previous = index > 0 ? chronological[index - 1] : null
    return {
      correctAnswers: Number(attempt.correct_answers),
      totalQuestions: Number(attempt.total_questions),
      secondsPerItem: Number(attempt.total_time_minutes) * 60 /
        Number(attempt.total_questions),
      gapDays: previous
        ? daysBetween(new Date(attempt.completed_at), new Date(previous.completed_at))
        : 0,
    }
  })
}

function toObservedPoints(attempts: QuizAttempt[]): ObservedPoint[] {
  return fluencyPoints(attempts).filter(point => !EXCLUDED_ATTEMPT_IDS.has(point.attempt.id)).map(({ attempt, dailyProbe }, index) => ({
    attempt: index + 1,
    rate: Math.max(0, Number(attempt.fluency_rate) || 0),
    accuracy: Number(attempt.accuracy_percentage) || 0,
    date: dayKey(attempt),
    dailyProbe,
  }))
}

function FluencyTrajectory({ observed, filtered, aim }: {
  observed: ObservedPoint[]
  filtered: ObservedFluencyTrajectory
  aim: number
}) {
  if (observed.length === 0) return <p>No timed attempts on this pack yet.</p>
  const width = 920
  const height = 450
  const margin = { top: 32, right: 38, bottom: 67, left: 76 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const dayMillis = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`).getTime()
  const first = dayMillis(observed[0].date)
  const last = dayMillis(observed[observed.length - 1].date)
  const span = Math.max(86_400_000, last - first)
  const xAt = (date: string) => margin.left + (dayMillis(date) - first) / span * plotWidth
  const floor = 0.5
  const ceiling = Math.max(aim * 2, ...observed.map(point => point.rate),
    ...filtered.points.map(point => point.upper80), 2)
  const maxRate = 2 ** Math.ceil(Math.log2(ceiling))
  const yAt = (value: number) => margin.top + plotHeight *
    (1 - Math.log2(Math.max(floor, value) / floor) / Math.log2(maxRate / floor))
  const probes = observed.filter(point => point.dailyProbe)
  const trajectory = probes.slice(0, filtered.points.length)
  const upper = trajectory.map((point, index) => `${xAt(point.date)},${yAt(filtered.points[index].upper80)}`)
  const lower = trajectory.map((point, index) => `${xAt(point.date)},${yAt(filtered.points[index].lower80)}`).reverse()
  const band = [...upper, ...lower].join(' ')
  const median = trajectory.map((point, index) => `${xAt(point.date)},${yAt(filtered.points[index].median)}`).join(' ')
  const yTicks: number[] = []
  for (let rate = floor; rate <= maxRate; rate *= 2) yTicks.push(rate)
  const xDates = [observed[0].date, observed[Math.floor((observed.length - 1) / 2)].date, observed[observed.length - 1].date]
    .filter((date, index, dates) => dates.findIndex(item => item.slice(0, 10) === date.slice(0, 10)) === index)
  return <div className="bl-trajectory-scroll"><svg viewBox={`0 0 ${width} ${height}`} className="bl-trajectory-chart"
    role="img" aria-label="Timed responses per minute by day on a logarithmic axis, with modelled fluency and an 80 percent credible band">
    <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="#f4f1df" stroke="#152219" />
    {yTicks.map(tick => <g key={tick}>
      <line x1={margin.left} y1={yAt(tick)} x2={width - margin.right} y2={yAt(tick)} stroke="#9aaa83" strokeWidth="0.7" />
      <text x={margin.left - 11} y={yAt(tick) + 4} textAnchor="end" className="bl-chart-tick">{tick}/min</text>
    </g>)}
    <line x1={margin.left} y1={yAt(aim)} x2={width - margin.right} y2={yAt(aim)} className="bl-aim-line" />
    <text x={width - margin.right - 5} y={yAt(aim) - 9} textAnchor="end" className="bl-aim-label">Aim {aim}/min</text>
    {trajectory.length > 1 && <polygon points={band} fill="#2f6f4e" opacity="0.19" />}
    {trajectory.length === 1 && <line x1={xAt(trajectory[0].date)} y1={yAt(filtered.points[0].lower80)}
      x2={xAt(trajectory[0].date)} y2={yAt(filtered.points[0].upper80)} stroke="#2f6f4e" strokeWidth="5" opacity="0.38" />}
    {trajectory.length > 1 && <polyline points={median} fill="none" stroke="#2f6f4e" strokeWidth="3" />}
    {observed.map(point => <circle key={point.attempt} cx={xAt(point.date)} cy={yAt(point.rate)}
      r={point.dailyProbe ? 6 : 4} fill={point.dailyProbe ? '#152219' : '#758077'}
      opacity={point.dailyProbe ? 1 : 0.35} stroke="#f4f1df" strokeWidth="1.5">
      <title>{`${point.dailyProbe ? 'Daily probe' : 'Later timing'} · ${point.rate.toFixed(1)}/min · ${point.accuracy.toFixed(0)}% · ${formatDate(point.date)}`}</title>
    </circle>)}
    {xDates.map(date => <text key={date} x={xAt(date)} y={height - 31} textAnchor="middle" className="bl-chart-tick">{formatDate(date)}</text>)}
    <text x={margin.left + plotWidth / 2} y={height - 8} textAnchor="middle" className="bl-chart-axis">Calendar day</text>
    <text x="20" y={margin.top + plotHeight / 2} textAnchor="middle"
      transform={`rotate(-90 20 ${margin.top + plotHeight / 2})`} className="bl-chart-axis">Correct/min · ratio scale</text>
  </svg></div>
}

function PackSelector({ quizzes, selectedQuiz, onSelect }: {
  quizzes: [string, { title: string; mode: ResponseMode }][]
  selectedQuiz: string
  onSelect: (quizId: string) => void
}) {
  const menuRef = useRef<HTMLDetailsElement>(null)
  const selected = quizzes.find(([id]) => id === selectedQuiz)?.[1]
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) menuRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  return <div className="bl-pack-selector">
    <span>Fluency pack</span>
    <details ref={menuRef} onKeyDown={event => {
      if (event.key === 'Escape') {
        menuRef.current?.removeAttribute('open')
        menuRef.current?.querySelector('summary')?.focus()
      }
    }}>
      <summary aria-label={`Fluency pack: ${selected?.title ?? 'Choose a pack'}`}>
        <span>{selected?.title} · {selected?.mode === 'typed' ? 'Typed' : 'Options'}</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="bl-pack-selector-menu" role="group" aria-label="Choose a fluency pack">
        {quizzes.map(([id, quiz]) => <button key={id} type="button"
          aria-current={id === selectedQuiz ? 'true' : undefined}
          onClick={() => {
            onSelect(id)
            menuRef.current?.removeAttribute('open')
            menuRef.current?.querySelector('summary')?.focus()
          }}>
          {quiz.title} · {quiz.mode === 'typed' ? 'Typed' : 'Options'}
        </button>)}
      </div>
    </details>
  </div>
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showTechnical, setShowTechnical] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    setAttempts([])
    setSelectedQuiz('')
    setLoadError(false)
    if (!user) { router.replace('/'); return }

    let cancelled = false
    setLoading(true)
    const loadAttempts = async () => {
      try {
        const records: any[] = []
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('quiz_attempts').select(`
            id, quiz_id, student_name, total_questions, correct_answers,
            accuracy_percentage, fluency_rate, total_time_minutes, completed_at, completed_day_ldn,
            attempt_purpose, session_id, independent, assistance_used, terminal_option_condition,
            learner_local_date, completed, hint_used_any, fewer_options_used,
            quizzes!inner(title, description, response_mode)
          `).eq('user_id', user.id).order('completed_at', { ascending: false })
            .order('id', { ascending: false }).range(offset, offset + 499)
          if (error) throw error
          records.push(...(data || []))
          if (!data || data.length < 500) break
        }
        const typedData = records.map((item: any) => ({
          ...item,
          quizzes: Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes,
        })) as QuizAttempt[]
        if (cancelled) return
        setAttempts(typedData)
        setSelectedQuiz(typedData[0]?.quiz_id || '')
      } catch (error) {
        console.error('Error loading progress:', error)
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadAttempts()
    return () => { cancelled = true }
  }, [router, user?.id, authLoading, reloadKey])

  const quizzes = useMemo(() => {
    const map = new Map<string, { title: string; mode: ResponseMode }>()
    attempts.forEach(attempt => {
      if (attempt.quizzes && !map.has(attempt.quiz_id)) {
        map.set(attempt.quiz_id, {
          title: attempt.quizzes.title,
          mode: attempt.quizzes.response_mode === 'typed' ? 'typed' : 'options',
        })
      }
    })
    return Array.from(map.entries())
  }, [attempts])
  const selectedAttempts = useMemo(
    () => attempts.filter(attempt => attempt.quiz_id === selectedQuiz),
    [attempts, selectedQuiz],
  )
  const selectedMeta = quizzes.find(([id]) => id === selectedQuiz)?.[1]
  const selectedMode: ResponseMode = selectedMeta?.mode ?? 'options'
  const fluencyAim = FLUENCY_AIMS[selectedMode]
  const accuracyAttempts = useMemo(() => completedAttempts(selectedAttempts), [selectedAttempts])
  const cumulative = useMemo(() => cumulativeRecord(attempts), [attempts])
  const fluencySource = useMemo(() => recognisesEarlierTimings(selectedAttempts)
    ? selectedAttempts : selectedAttempts.filter(attempt => attempt.attempt_purpose !== null), [selectedAttempts])
  const chronological = useMemo(() => eligibleAttempts(fluencySource), [fluencySource])
  const history = useMemo(() => toStateSpaceHistory(fluencySource), [fluencySource])
  const observed = useMemo(() => toObservedPoints(fluencySource), [fluencySource])
  const filtered = useMemo(() => {
    const probes = eligibleAttempts(fluencySource)
    const firstDay = probes[0] ? new Date(`${dayKey(probes[0])}T12:00:00Z`).getTime() : 0
    const elapsed = probes.map(probe => (new Date(`${dayKey(probe)}T12:00:00Z`).getTime() - firstDay) / 86_400_000)
    return filterObservedFluency(STATE_SPACE_BUNDLE, selectedMode, history, elapsed)
  }, [fluencySource, selectedMode, history])
  const latest = chronological[chronological.length - 1]
  const plannedItems = latest
    ? Math.max(1, Math.round(Number(latest.total_questions))) : 36
  const elapsedDaysSinceLatest = latest
    ? daysBetween(new Date(), new Date(latest.completed_at)) : 0
  const nextForecast = useMemo(() => forecastNextAttempt(STATE_SPACE_BUNDLE, {
    mode: selectedMode, history, nextGapDays: elapsedDaysSinceLatest, plannedItems,
  }), [selectedMode, history, elapsedDaysSinceLatest, plannedItems])
  const bestRate = observed.length ? Math.max(...observed.map(point => point.rate)) : 0

  if (loading || authLoading || !user) return <div className="bl-page bl-loading min-h-screen">
    <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
    <p className="bl-kicker">Loading performance record</p>
  </div>

  if (loadError) return <div className="bl-page bl-progress-page">
    <main className="bl-container bl-progress-main">
      <section className="bl-progress-empty" role="alert">
        <h1>We couldn’t load your progress.</h1>
        <p>Your record may still be available. Try again before starting another timing.</p>
        <button className="bl-button" onClick={() => setReloadKey(value => value + 1)}>Try again</button>
        <Link href="/">Return home</Link>
      </section>
    </main>
  </div>

  return <div className="bl-page bl-progress-page">
    <header className="bl-header bl-category-header">
      <div className="bl-container bl-header-inner">
        <Link href="/" className="bl-wordmark" aria-label="BehaviorLingo home">
          <span className="bl-wordmark-mark">BL</span>
          <span>behavior<span>lingo</span></span>
        </Link>
        <nav className="bl-progress-nav" aria-label="Progress navigation">
          <Link href="/leaderboard">Leaderboard</Link><Link href="/">Home</Link>
        </nav>
      </div>
    </header>

    <main className="bl-container bl-progress-main">
      <section className="bl-progress-intro">
        <div><p className="bl-kicker">Performance record</p>
          <h1>Your practice, accuracy and speed.</h1>
          <div className="bl-progress-rules">
            <p><strong>Accuracy record</strong><span>Every completed attempt, including timed practice.</span></p>
            <p><strong>Fluency aim</strong><span>One daily timing at 100% and {fluencyAim} correct/min.</span></p>
          </div>
        </div>
        {attempts.length > 0 && <PackSelector quizzes={quizzes} selectedQuiz={selectedQuiz} onSelect={setSelectedQuiz} />}
      </section>

      {attempts.length === 0 ? <section className="bl-progress-empty">
        <span>NO_ATTEMPTS_RECORDED</span>
        <h2>Your performance record starts with a pack attempt.</h2>
        <p>First, work toward getting every answer right. After two perfect sessions without prompts, you can start timed practice.</p>
        <button className="bl-button" onClick={() => router.push('/')}>
          Choose a pack <span>→</span>
        </button>
      </section> : <>
        <section className="bl-trajectory-panel bl-accuracy-panel" aria-label="Accuracy by attempt">
          <div className="bl-panel-heading"><div>
            <p className="bl-kicker">01 · Accuracy</p><h2>{selectedMeta?.title}</h2>
          </div><div className="bl-model-state"><i /><span>{accuracyAttempts.length} completed attempt{accuracyAttempts.length === 1 ? '' : 's'}</span></div></div>
          <AccuracyByAttempt attempts={accuracyAttempts} />
        </section>

        {latest ? <>
        <section className="bl-trajectory-panel">
          <div className="bl-panel-heading"><div>
            <p className="bl-kicker">02 · Timed practice</p><h2>{selectedMeta?.title}</h2>
          </div><div className="bl-model-state"><i />
            <span>{history.length < 2 ? 'Limited history' : 'Observed timings'}</span>
          </div></div>
          <FluencyTrajectory observed={observed} filtered={filtered} aim={fluencyAim} />
          <div className="bl-chart-key">
            <span><i className="bl-key-point" />First timing each day</span>
            <span><i className="bl-key-point" style={{ opacity: 0.28 }} />Later practice</span>
            <span><i className="bl-key-observed" />Filtered rate and 80% band</span>
          </div>
          <p className="bl-chart-note">The band covers the observed days. Zero-correct timings appear at the chart floor on the ratio scale. The next-attempt estimate below is separate.</p>
          {filtered.weeklyFactor && history.length >= 3 && observed.filter(point => point.dailyProbe).length >= 3 &&
            daysBetween(new Date(observed.filter(point => point.dailyProbe).at(-1)!.date), new Date(observed.find(point => point.dailyProbe)!.date)) >= 7 &&
            <p className="bl-celeration">Provisional model-implied change over these observed days: ×{filtered.weeklyFactor.point.toFixed(2)}/week
              <span> · 80% across parameter draws ×{filtered.weeklyFactor.lower80.toFixed(2)}–×{filtered.weeklyFactor.upper80.toFixed(2)}</span>
            </p>}
          {history.length < 2 && <div className="bl-early-notice">
            <strong>Limited history</strong>
            <span>Complete at least two timings on this pack before interpreting the personalised next-attempt estimate. Until then, the population prior contributes most of the information.</span>
          </div>}
        </section>

        <section className="bl-progress-summary" aria-label="Performance summary">
          <div><span>Latest timing</span>
            <strong>{Number(latest.fluency_rate).toFixed(1)}<small>/min</small></strong>
            <p>{Number(latest.accuracy_percentage).toFixed(0)}% accuracy</p>
          </div>
          <div><span>Predicted if attempted now</span>
            <strong>{nextForecast.correctPerMinute.point.toFixed(1)}<small>/min</small></strong>
            <p>{nextForecast.correctPerMinute.lower80.toFixed(1)}–{nextForecast.correctPerMinute.upper80.toFixed(1)}/min · 80% range</p>
          </div>
          <div className={nextForecast.accuracyProbability.point >= ACCURACY_AIM / 100
            ? 'is-positive' : ''}>
            <span>Predicted accuracy</span>
            <strong>{(100 * nextForecast.accuracyProbability.point).toFixed(0)}<small>%</small></strong>
            <p>{(100 * nextForecast.accuracyProbability.lower80).toFixed(0)}–{(100 * nextForecast.accuracyProbability.upper80).toFixed(0)}% · 80% range</p>
          </div>
          <div><span>Best observed</span>
            <strong>{bestRate.toFixed(1)}<small>/min</small></strong>
            <p>{observed.length} timed attempt{observed.length === 1 ? '' : 's'}</p>
          </div>
        </section>

        <section className="bl-technical-panel">
          <button onClick={() => setShowTechnical(value => !value)}
            aria-expanded={showTechnical}>
            <span><b>Technical view</b><small>Model assumptions and validation</small></span>
            <i>{showTechnical ? '−' : '+'}</i>
          </button>
          {showTechnical && <div className="bl-technical-content">
            <div><span>Bayesian model</span>
              <strong>Bivariate damped local-linear-trend state-space model</strong>
              <p>The latent learner state tracks accuracy and log seconds per item together, including changing levels, trends, practice gaps and residual association.</p>
            </div>
            <div><span>Personalisation</span>
              <strong>{history.length} first-daily timing{history.length === 1 ? '' : 's'} on this pack</strong>
              <p>Only the first timing each day updates the filtered latent state. Later timings that day remain on the chart as practice.</p>
            </div>
            <div><span>Uncertainty</span>
              <strong>Filtered latent rate with an 80% interval</strong>
              <p>The green band represents uncertainty in latent rate over the days with observed daily probes. Later same-day practice remains visible but does not update that curve.</p>
            </div>
            <div><span>Numerical validation</span><strong>Next-attempt engine checked against R</strong>
              <p>The original next-attempt forecasts matched five offline R reference scenarios. The new observed-day filter and weekly summary still need separate equivalence checks.</p>
            </div>
            <div><span>Weekly change</span><strong>Exploratory within the observed period</strong>
              <p>The weekly factor summarises the modelled rate over recorded daily probes. Its interval reflects parameter-draw variation and is not a fully calibrated celeration interval.</p>
            </div>
            <div><span>Interpretation</span><strong>Estimate if attempted now, not a guarantee</strong>
              <p>No multi-session trajectory is extrapolated. Typed-mode estimates remain tentative because the historical typed sample is small.</p>
            </div>
          </div>}
        </section>
      </> : <section className="bl-trajectory-panel" aria-label="Timed practice locked">
        <div className="bl-panel-heading"><div>
          <p className="bl-kicker">02 · Timed practice</p><h2>{selectedMeta?.title}</h2>
        </div></div>
        <div className="bl-fluency-locked">
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
            <rect x="12" y="28" width="40" height="29" rx="3" stroke="currentColor" strokeWidth="4" />
            <path d="M21 28v-9a11 11 0 0 1 22 0v9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="32" cy="41" r="3" fill="currentColor" />
          </svg>
          <p>Complete two accuracy sets at 100% to unlock fluency practice</p>
        </div>
      </section>}

        <section className="bl-history-panel">
          <div className="bl-panel-heading bl-panel-heading-compact"><div>
            <p className="bl-kicker">Attempt record</p><h2>Recent completed attempts</h2>
          </div></div>
          <div className="bl-history-scroll"><table>
            <thead><tr><th>Attempt</th><th>Date</th><th>Accuracy</th><th>Hint</th><th>Rate</th><th>Status</th></tr></thead>
            <tbody>{accuracyAttempts.slice().reverse().slice(0, 10).map((attempt, reverseIndex) => {
              const attemptNumber = accuracyAttempts.length - reverseIndex
              const meetsAim = Number(attempt.accuracy_percentage) >= ACCURACY_AIM &&
                Number(attempt.fluency_rate) >= fluencyAim && attempt.attempt_purpose !== 'accuracy_probe' && attempt.attempt_purpose !== 'accuracy_practice'
              return <tr key={attempt.id}>
                <td>A{String(attemptNumber).padStart(2, '0')}</td>
                <td>{formatDate(attempt.completed_at)}</td>
                <td>{Number(attempt.accuracy_percentage).toFixed(0)}%</td>
                <td>{attempt.hint_used_any === null ? 'Unknown' : attempt.hint_used_any ? 'Used' : 'No'}</td>
                <td>{attempt.attempt_purpose?.startsWith('accuracy') ? '—' : `${Number(attempt.fluency_rate).toFixed(1)}/min`}</td>
                <td><span className={meetsAim ? 'is-met' : 'is-building'}>
                  {meetsAim ? 'Timing aim met' : attempt.fewer_options_used ? 'Fewer options' : attempt.assistance_used ? 'Supported' : 'Practice'}
                </span></td>
              </tr>
            })}</tbody>
          </table></div>
        </section>

        <section className="bl-trajectory-panel" aria-label="Cumulative learning record">
          <div className="bl-panel-heading"><div>
            <p className="bl-kicker">03 · Cumulative record</p><h2>Practice adds up.</h2>
          </div></div>
          <CumulativeRecord points={cumulative} />
        </section>
      </>}
    </main>
  </div>
}
