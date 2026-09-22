'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import stateSpaceBundleJson from './behaviorlingo_state_space_posterior_bundle_v3.json'
import {
  forecastNextAttempt,
  forecastNextAttemptFluencySamples,
  type AttemptObservation,
  type NextAttemptForecast,
  type StateSpacePosteriorBundleV3,
} from './behaviorlingo-state-space-v3'

type ResponseMode = 'options' | 'typed'

interface QuizAttempt {
  id: string
  quiz_id: string
  student_name: string
  total_questions: number
  correct_answers: number
  accuracy_percentage: number
  fluency_rate: number
  total_time_minutes: number
  completed_at: string
  quizzes: {
    title: string
    description: string
    response_mode: ResponseMode | null
  } | null
}

interface ObservedPoint {
  attempt: number
  rate: number
  accuracy: number
  date: string
}

const STATE_SPACE_BUNDLE =
  stateSpaceBundleJson as unknown as StateSpacePosteriorBundleV3
const ACCURACY_AIM = 90
const FLUENCY_AIMS: Record<ResponseMode, number> = { options: 15, typed: 6 }
const EXCLUDED_ATTEMPT_IDS = new Set([
  '157f465a-957c-46bf-b523-0b56134d5118',
  '163bbf23-690b-4530-961d-c1d2edb702b2',
])

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))
const daysBetween = (later: Date, earlier: Date) =>
  Math.max(0, (later.getTime() - earlier.getTime()) / 86_400_000)
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value))

function eligibleAttempts(attempts: QuizAttempt[]): QuizAttempt[] {
  return attempts
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
  return eligibleAttempts(attempts).map((attempt, index) => ({
    attempt: index + 1,
    rate: Math.max(0, Number(attempt.fluency_rate) || 0),
    accuracy: Number(attempt.accuracy_percentage) || 0,
    date: attempt.completed_at,
  }))
}

function FluencyTrajectory({
  observed,
  forecast,
  fluencySamples,
  aim,
}: {
  observed: ObservedPoint[]
  forecast: NextAttemptForecast
  fluencySamples: number[]
  aim: number
}) {
  const width = 920
  const height = 470
  const margin = { top: 34, right: 34, bottom: 64, left: 76 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const predictedAttempt = observed.length + 1
  const finalAttempt = Math.max(2, predictedAttempt)
  const yMaximumRaw = Math.max(
    aim * 1.35,
    ...observed.map(point => point.rate * 1.15),
    forecast.correctPerMinute.upper80 * 1.08,
  )
  const yMaximum = Math.max(5, Math.ceil(yMaximumRaw / 5) * 5)
  const xAt = (attempt: number) => margin.left +
    ((attempt - 1) / Math.max(1, finalAttempt - 1)) * plotWidth
  const yAt = (rate: number) => margin.top + plotHeight -
    (clamp(rate, 0, yMaximum) / yMaximum) * plotHeight
  const observedPath = observed
    .map(point => `${xAt(point.attempt)},${yAt(point.rate)}`).join(' ')
  const yTicks = Array.from({ length: 6 }, (_, index) => yMaximum / 5 * index)
  const xTicks = Array.from({ length: finalAttempt }, (_, index) => index + 1)
    .filter(value => finalAttempt <= 16 || value === 1 || value === finalAttempt || value % 2 === 0)
  const predictionX = xAt(predictedAttempt)
  const pointY = yAt(forecast.correctPerMinute.point)
  const lowerY = yAt(forecast.correctPerMinute.lower80)
  const upperY = yAt(forecast.correctPerMinute.upper80)
  const densityValues = fluencySamples.filter(Number.isFinite).sort((a, b) => a - b)
  const densityLower = densityValues[Math.floor(0.005 * (densityValues.length - 1))] ?? 0
  const densityUpper = densityValues[Math.ceil(0.995 * (densityValues.length - 1))] ?? yMaximum
  const densityMean = densityValues.reduce((sum, value) => sum + value, 0) /
    Math.max(1, densityValues.length)
  const densitySd = Math.sqrt(densityValues.reduce(
    (sum, value) => sum + (value - densityMean) ** 2, 0,
  ) / Math.max(1, densityValues.length - 1))
  const bandwidth = Math.max(
    0.05,
    1.06 * densitySd * Math.max(1, densityValues.length) ** -0.2,
  )
  const densityGrid = Array.from({ length: 81 }, (_, index) =>
    densityLower + index / 80 * Math.max(0.001, densityUpper - densityLower))
  const density = densityGrid.map(value => densityValues.reduce(
    (sum, sample) => {
      const z = (value - sample) / bandwidth
      return sum + Math.exp(-0.5 * z * z)
    }, 0) / (Math.max(1, densityValues.length) * bandwidth * Math.sqrt(2 * Math.PI)))
  const maximumDensity = Math.max(...density, 1e-12)
  const eyeWidth = Math.min(62, plotWidth / Math.max(3, finalAttempt) * 0.78)
  const halfEyePath = [
    `M ${predictionX},${yAt(densityGrid[0] ?? 0)}`,
    ...densityGrid.map((value, index) =>
      `L ${predictionX - eyeWidth * density[index] / maximumDensity},${yAt(value)}`),
    `L ${predictionX},${yAt(densityGrid[densityGrid.length - 1] ?? 0)} Z`,
  ].join(' ')

  return (
    <div className="bl-trajectory-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} className="bl-trajectory-chart"
        role="img" aria-label="Observed fluency timings and state-space prediction for the next session">
        <defs>
          <pattern id="bl-chart-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#9aaa83" strokeWidth="0.35" opacity="0.28" />
          </pattern>
        </defs>
        <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight}
          fill="url(#bl-chart-grid)" stroke="#152219" />
        {yTicks.map(tick => <g key={tick}>
          <line x1={margin.left} y1={yAt(tick)} x2={width - margin.right} y2={yAt(tick)}
            stroke="#9aaa83" strokeWidth="0.7" opacity="0.55" />
          <text x={margin.left - 14} y={yAt(tick) + 4} textAnchor="end"
            className="bl-chart-tick">{tick.toFixed(0)}</text>
        </g>)}
        {xTicks.map(attempt => <g key={attempt}>
          <line x1={xAt(attempt)} y1={margin.top + plotHeight} x2={xAt(attempt)}
            y2={margin.top + plotHeight + 7} stroke="#152219" />
          <text x={xAt(attempt)} y={margin.top + plotHeight + 25} textAnchor="middle"
            className="bl-chart-tick">{attempt}</text>
        </g>)}
        <line x1={margin.left} y1={yAt(aim)} x2={width - margin.right} y2={yAt(aim)}
          className="bl-aim-line" />
        <text x={width - margin.right - 5} y={yAt(aim) - 9} textAnchor="end"
          className="bl-aim-label">Aim {aim}/min</text>
        {observed.length > 1 && <polyline points={observedPath} className="bl-observed-path" />}
        <path d={halfEyePath} fill="#2f6f4e" opacity="0.32" stroke="#2f6f4e" strokeWidth="1.5">
          <title>Posterior predictive density if attempted now</title>
        </path>
        <line x1={predictionX} y1={upperY} x2={predictionX} y2={lowerY}
          stroke="#2f6f4e" strokeWidth="2.5">
          <title>80% posterior-predictive interval</title>
        </line>
        <circle cx={predictionX} cy={pointY} r="6" fill="#152219" stroke="#f4f1df" strokeWidth="2">
          <title>{`Median if attempted now: ${forecast.correctPerMinute.point.toFixed(1)}/min (${forecast.correctPerMinute.lower80.toFixed(1)}–${forecast.correctPerMinute.upper80.toFixed(1)})`}</title>
        </circle>
        {observed.map(point => <circle key={point.attempt} cx={xAt(point.attempt)}
          cy={yAt(point.rate)} r="6"
          className={point.accuracy >= ACCURACY_AIM
            ? 'bl-observation is-accurate' : 'bl-observation is-building'}>
          <title>{`Attempt ${point.attempt} · ${point.rate.toFixed(1)}/min · ${point.accuracy.toFixed(0)}% · ${formatDate(point.date)}`}</title>
        </circle>)}
        <text x={margin.left + plotWidth / 2} y={height - 14} textAnchor="middle"
          className="bl-chart-axis">Attempt number</text>
        <text x="19" y={margin.top + plotHeight / 2} textAnchor="middle"
          transform={`rotate(-90 19 ${margin.top + plotHeight / 2})`}
          className="bl-chart-axis">Correct responses per minute</text>
      </svg>
    </div>
  )
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState('')
  const [loading, setLoading] = useState(true)
  const [showTechnical, setShowTechnical] = useState(false)
  const loadingRef = useRef(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) { router.push('/'); return }
    if (loadingRef.current) return
    const loadAttempts = async () => {
      loadingRef.current = true
      try {
        const { data, error } = await supabase.from('quiz_attempts').select(`
          id, quiz_id, student_name, total_questions, correct_answers,
          accuracy_percentage, fluency_rate, total_time_minutes, completed_at,
          quizzes!inner(title, description, response_mode)
        `).eq('user_id', user.id).order('completed_at', { ascending: false })
        if (error) throw error
        const typedData = (data || []).map((item: any) => ({
          ...item,
          quizzes: Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes,
        })) as QuizAttempt[]
        setAttempts(typedData)
        setSelectedQuiz(current => current || typedData[0]?.quiz_id || '')
      } catch (error) {
        console.error('Error loading progress:', error)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }
    void loadAttempts()
  }, [router, user])

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
  const chronological = useMemo(() => eligibleAttempts(selectedAttempts), [selectedAttempts])
  const history = useMemo(() => toStateSpaceHistory(selectedAttempts), [selectedAttempts])
  const observed = useMemo(() => toObservedPoints(selectedAttempts), [selectedAttempts])
  const latest = chronological[chronological.length - 1]
  const plannedItems = latest
    ? Math.max(1, Math.round(Number(latest.total_questions))) : 36
  const elapsedDaysSinceLatest = latest
    ? daysBetween(new Date(), new Date(latest.completed_at)) : 0
  const nextForecast = useMemo(() => forecastNextAttempt(STATE_SPACE_BUNDLE, {
    mode: selectedMode, history, nextGapDays: elapsedDaysSinceLatest, plannedItems,
  }), [selectedMode, history, elapsedDaysSinceLatest, plannedItems])
  const nextFluencySamples = useMemo(() => forecastNextAttemptFluencySamples(
    STATE_SPACE_BUNDLE,
    { mode: selectedMode, history, nextGapDays: elapsedDaysSinceLatest, plannedItems },
  ), [selectedMode, history, elapsedDaysSinceLatest, plannedItems])
  const bestRate = observed.length ? Math.max(...observed.map(point => point.rate)) : 0

  if (loading) return <div className="bl-page bl-loading min-h-screen">
    <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
    <p className="bl-kicker">Loading performance record</p>
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
          <h1>Your progress and next-attempt estimate.</h1>
          <p>The graph shows this learner’s recorded timings and the posterior predictive distribution if the same pack were attempted now.</p>
        </div>
        {attempts.length > 0 && <label className="bl-pack-selector">
          <span>Fluency pack</span>
          <select value={selectedQuiz} onChange={event => setSelectedQuiz(event.target.value)}>
            {quizzes.map(([id, quiz]) => <option key={id} value={id}>
              {quiz.title} · {quiz.mode === 'typed' ? 'Typed' : 'Options'}
            </option>)}
          </select>
        </label>}
      </section>

      {attempts.length === 0 ? <section className="bl-progress-empty">
        <span>NO_TIMINGS_RECORDED</span>
        <h2>Your performance record starts with a fluency timing.</h2>
        <p>Complete a pack and its accuracy, rate and duration will appear here automatically.</p>
        <button className="bl-button" onClick={() => router.push('/')}>
          Choose a pack <span>→</span>
        </button>
      </section> : latest ? <>
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
            <p>{observed.length} eligible timing{observed.length === 1 ? '' : 's'}</p>
          </div>
        </section>

        <section className="bl-trajectory-panel">
          <div className="bl-panel-heading"><div>
            <p className="bl-kicker">Fluency trajectory</p><h2>{selectedMeta?.title}</h2>
          </div><div className="bl-model-state"><i />
            <span>{history.length < 2 ? 'Limited history' : 'Personalised forecast'}</span>
          </div></div>
          <FluencyTrajectory observed={observed} forecast={nextForecast}
            fluencySamples={nextFluencySamples} aim={fluencyAim} />
          <div className="bl-chart-key">
            <span><i className="bl-key-point" />Observed timing</span>
            <span><i className="bl-key-observed" />Observed path</span>
            <span><i className="bl-key-point" style={{ background: '#152219' }} />Median if attempted now</span>
            <span><i style={{ background: '#2f6f4e', opacity: 0.35 }} />Posterior predictive density</span>
          </div>
          {history.length < 2 && <div className="bl-early-notice">
            <strong>Limited history</strong>
            <span>Complete at least two timings on this pack before interpreting the personalised next-attempt estimate. Until then, the population prior contributes most of the information.</span>
          </div>}
        </section>

        <section className="bl-history-panel">
          <div className="bl-panel-heading bl-panel-heading-compact"><div>
            <p className="bl-kicker">Timing log</p><h2>Recent attempts</h2>
          </div></div>
          <div className="bl-history-scroll"><table>
            <thead><tr><th>Attempt</th><th>Date</th><th>Accuracy</th><th>Correct/min</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>{chronological.slice().reverse().slice(0, 10).map((attempt, reverseIndex) => {
              const attemptNumber = chronological.length - reverseIndex
              const meetsAim = Number(attempt.accuracy_percentage) >= ACCURACY_AIM &&
                Number(attempt.fluency_rate) >= fluencyAim
              return <tr key={attempt.id}>
                <td>A{String(attemptNumber).padStart(2, '0')}</td>
                <td>{formatDate(attempt.completed_at)}</td>
                <td>{Number(attempt.accuracy_percentage).toFixed(0)}%</td>
                <td>{Number(attempt.fluency_rate).toFixed(1)}</td>
                <td>{Number(attempt.total_time_minutes).toFixed(1)} min</td>
                <td><span className={meetsAim ? 'is-met' : 'is-building'}>
                  {meetsAim ? 'Aim met' : 'Building'}
                </span></td>
              </tr>
            })}</tbody>
          </table></div>
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
              <strong>{history.length} eligible timing{history.length === 1 ? '' : 's'} on this pack</strong>
              <p>Each timing updates the learner’s filtered latent state. New learners begin at the fitted population distribution.</p>
            </div>
            <div><span>Uncertainty</span>
              <strong>{nextFluencySamples.length} posterior predictive draws</strong>
              <p>The half-eye shows where next-attempt outcomes are most plausible; the dot is the median and the vertical line is the central 80% interval.</p>
            </div>
            <div><span>Numerical validation</span><strong>R and TypeScript matched</strong>
              <p>All five golden scenarios matched the offline R reference within 1e-7 tolerance.</p>
            </div>
            <div><span>Interpretation</span><strong>Estimate if attempted now, not a guarantee</strong>
              <p>No multi-session trajectory is extrapolated. Typed-mode estimates remain tentative because the historical typed sample is small.</p>
            </div>
          </div>}
        </section>
      </> : null}
    </main>
  </div>
}
