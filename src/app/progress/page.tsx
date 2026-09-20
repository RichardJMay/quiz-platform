'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

interface ChartPoint {
  attempt: number
  median: number
  lower: number
  upper: number
  forecast: boolean
}

interface BayesianModel {
  observed: Array<{
    attempt: number
    rate: number
    accuracy: number
    date: string
  }>
  curve: ChartPoint[]
  next: { median: number; lower: number; upper: number }
  masteryProbability: number | null
  ceiling: number
  status: 'early' | 'developing' | 'established'
}

const ACCURACY_AIM = 90

// These mirror the current mode-specific aims used on the pack-selection page.
// Keeping them explicit here is safer until aims are stored per quiz.
const FLUENCY_AIMS: Record<ResponseMode, number> = {
  options: 15,
  typed: 6,
}

// Empirical task-level guardrails calibrated from 2,017 historical attempts.
// They sit above the recorded maxima (20.46 options; 7.28 typed), allowing a
// genuine future record without admitting implausible response rates.
const BASE_RATE_CEILINGS: Record<ResponseMode, number> = {
  options: 24,
  typed: 9,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const quantile = (sorted: number[], probability: number) => {
  if (!sorted.length) return 0
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const remainder = position - lower
  return sorted[lower + 1] === undefined
    ? sorted[lower]
    : sorted[lower] + remainder * (sorted[lower + 1] - sorted[lower])
}

const makeRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

const sampleNormal = (random: () => number) => {
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

const sampleGamma = (shape: number, random: () => number): number => {
  if (shape < 1) {
    return sampleGamma(shape + 1, random) * Math.pow(Math.max(random(), Number.EPSILON), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  while (true) {
    const normal = sampleNormal(random)
    const vBase = 1 + c * normal
    if (vBase <= 0) continue
    const v = vBase * vBase * vBase
    const u = random()
    if (u < 1 - 0.0331 * normal ** 4) return d * v
    if (Math.log(u) < 0.5 * normal * normal + d * (1 - v + Math.log(v))) return d * v
  }
}

type Vector2 = [number, number]
type Matrix2 = [[number, number], [number, number]]

interface LogisticPosterior {
  mean: Vector2
  covariance: Matrix2
}

interface SpeedPosterior {
  mean: Vector2
  covariance: Matrix2
  shape: number
  scale: number
  floorSeconds: number
  ceiling: number
}

const logistic = (value: number) => {
  if (value >= 0) return 1 / (1 + Math.exp(-value))
  const exponential = Math.exp(value)
  return exponential / (1 + exponential)
}

const invertSymmetric2 = (m00: number, m01: number, m11: number): Matrix2 => {
  const determinant = Math.max(1e-10, m00 * m11 - m01 * m01)
  return [
    [m11 / determinant, -m01 / determinant],
    [-m01 / determinant, m00 / determinant],
  ]
}

const sampleBivariateNormal = (
  mean: Vector2,
  covariance: Matrix2,
  random: () => number,
  varianceMultiplier = 1,
): Vector2 => {
  const multiplier = Math.sqrt(Math.max(1e-12, varianceMultiplier))
  const l00 = Math.sqrt(Math.max(1e-12, covariance[0][0]))
  const l10 = covariance[1][0] / l00
  const l11 = Math.sqrt(Math.max(1e-12, covariance[1][1] - l10 * l10))
  const z0 = sampleNormal(random)
  const z1 = sampleNormal(random)
  return [
    mean[0] + multiplier * l00 * z0,
    mean[1] + multiplier * (l10 * z0 + l11 * z1),
  ]
}

function fitAccuracyTrajectory(attempts: QuizAttempt[]): LogisticPosterior {
  // Weakly informative priors: accuracy starts broadly around 70%, while the
  // per-attempt learning slope is centred at zero rather than assuming growth.
  // The broad priors allow a short run of real observations to dominate.
  const priorMean: Vector2 = [Math.log(0.70 / 0.30), 0]
  const priorPrecision: Vector2 = [1 / 4, 1 / 0.64]
  let estimate: Vector2 = [...priorMean]

  for (let iteration = 0; iteration < 18; iteration += 1) {
    let precision00 = priorPrecision[0]
    let precision01 = 0
    let precision11 = priorPrecision[1]
    let gradient0 = priorPrecision[0] * (priorMean[0] - estimate[0])
    let gradient1 = priorPrecision[1] * (priorMean[1] - estimate[1])

    attempts.forEach((attempt, index) => {
      const x = index
      const total = Math.max(1, attempt.total_questions)
      const probability = logistic(estimate[0] + estimate[1] * x)
      const weight = Math.max(1e-6, total * probability * (1 - probability))
      const residual = attempt.correct_answers - total * probability
      precision00 += weight
      precision01 += weight * x
      precision11 += weight * x * x
      gradient0 += residual
      gradient1 += residual * x
    })

    const covariance = invertSymmetric2(precision00, precision01, precision11)
    const delta0 = covariance[0][0] * gradient0 + covariance[0][1] * gradient1
    const delta1 = covariance[1][0] * gradient0 + covariance[1][1] * gradient1
    estimate = [estimate[0] + delta0, estimate[1] + delta1]
    if (Math.max(Math.abs(delta0), Math.abs(delta1)) < 1e-7) break
  }

  let precision00 = priorPrecision[0]
  let precision01 = 0
  let precision11 = priorPrecision[1]
  attempts.forEach((attempt, index) => {
    const x = index
    const probability = logistic(estimate[0] + estimate[1] * x)
    const weight = Math.max(1e-6, attempt.total_questions * probability * (1 - probability))
    precision00 += weight
    precision01 += weight * x
    precision11 += weight * x * x
  })

  return {
    mean: estimate,
    covariance: invertSymmetric2(precision00, precision01, precision11),
  }
}

function fitSpeedTrajectory(attempts: QuizAttempt[], mode: ResponseMode): SpeedPosterior {
  const ceiling = BASE_RATE_CEILINGS[mode]
  const floorSeconds = 60 / ceiling
  // Conservative starting anchors keep the model from manufacturing high
  // initial fluency before the learner has supplied enough timings.
  const typicalSeconds = mode === 'typed' ? 12 : 8

  // Model the log time above a mechanical response-time floor. This keeps
  // predicted correct/min below a transparent, mode-specific task ceiling.
  const priorMean: Vector2 = [Math.log(Math.max(0.25, typicalSeconds - floorSeconds)), 0]
  const priorPrecision: Vector2 = [1 / 4, 1 / 0.64]
  const priorShape = 2.5
  const priorScale = 0.45
  let xx00 = priorPrecision[0]
  let xx01 = 0
  let xx11 = priorPrecision[1]
  let xy0 = priorPrecision[0] * priorMean[0]
  let xy1 = priorPrecision[1] * priorMean[1]
  let ySquared = 0

  attempts.forEach((attempt, index) => {
    const x = index
    const secondsPerItem = Math.max(
      floorSeconds + 0.01,
      (attempt.total_time_minutes * 60) / Math.max(1, attempt.total_questions),
    )
    const y = Math.log(Math.max(0.01, secondsPerItem - floorSeconds))
    xx00 += 1
    xx01 += x
    xx11 += x * x
    xy0 += y
    xy1 += x * y
    ySquared += y * y
  })

  const covariance = invertSymmetric2(xx00, xx01, xx11)
  const mean: Vector2 = [
    covariance[0][0] * xy0 + covariance[0][1] * xy1,
    covariance[1][0] * xy0 + covariance[1][1] * xy1,
  ]
  const priorQuadratic =
    priorPrecision[0] * priorMean[0] ** 2 + priorPrecision[1] * priorMean[1] ** 2
  const posteriorQuadratic = mean[0] * xy0 + mean[1] * xy1

  return {
    mean,
    covariance,
    shape: priorShape + attempts.length / 2,
    scale: Math.max(0.05, priorScale + 0.5 * (ySquared + priorQuadratic - posteriorQuadratic)),
    floorSeconds,
    ceiling,
  }
}

function sampleLatentRate(
  attemptNumber: number,
  accuracy: LogisticPosterior,
  speed: SpeedPosterior,
  random: () => number,
  includeSessionVariation: boolean,
) {
  // A linear attempt index here produces a saturating learning curve because
  // accuracy is logistic and response time approaches (but cannot cross) the
  // task floor. It is more responsive than log(attempt) during early practice.
  const x = attemptNumber - 1
  const accuracyDraw = sampleBivariateNormal(accuracy.mean, accuracy.covariance, random)
  const probability = logistic(accuracyDraw[0] + accuracyDraw[1] * x)
  const variance = speed.scale / sampleGamma(speed.shape, random)
  const speedDraw = sampleBivariateNormal(speed.mean, speed.covariance, random, variance)
  const residual = includeSessionVariation ? Math.sqrt(variance) * sampleNormal(random) : 0
  const secondsPerItem = speed.floorSeconds + Math.exp(speedDraw[0] + speedDraw[1] * x + residual)
  return { probability, secondsPerItem, rate: (60 * probability) / secondsPerItem }
}

function fitBayesianLearningCurve(
  attempts: QuizAttempt[],
  aim: number,
  mode: ResponseMode,
): BayesianModel | null {
  if (!attempts.length) return null

  const chronological = attempts.slice().sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime(),
  )
  const observed = chronological.map((attempt, index) => ({
    attempt: index + 1,
    rate: Math.max(0, Number(attempt.fluency_rate) || 0),
    accuracy: Number(attempt.accuracy_percentage) || 0,
    date: attempt.completed_at,
  }))

  const accuracyPosterior = fitAccuracyTrajectory(chronological)
  const speedPosterior = fitSpeedTrajectory(chronological, mode)
  // Long-range forecasts are poorly identified from a short personal series.
  // Reveal them gradually as the learner contributes more evidence.
  const forecastAttempts = observed.length < 6 ? 1 : observed.length < 10 ? 2 : 3

  const curve = Array.from(
    { length: observed.length + forecastAttempts },
    (_, index): ChartPoint => {
      const attemptNumber = index + 1
      const random = makeRandom(8101 + attemptNumber * 1543 + observed.length * 97)
      const rates = Array.from({ length: 1800 }, () =>
        sampleLatentRate(attemptNumber, accuracyPosterior, speedPosterior, random, false).rate,
      ).sort((a, b) => a - b)
      return {
        attempt: attemptNumber,
        median: quantile(rates, 0.5),
        lower: quantile(rates, 0.1),
        upper: quantile(rates, 0.9),
        forecast: attemptNumber > observed.length,
      }
    },
  )

  const nextQuestionCount = Math.max(1, chronological[chronological.length - 1].total_questions)
  const random = makeRandom(104729 + observed.length * 7919 + Math.round(aim * 100))
  const simulations = 4000
  const nextRates: number[] = []
  let masteryCount = 0

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    const draw = sampleLatentRate(
      observed.length + 1,
      accuracyPosterior,
      speedPosterior,
      random,
      true,
    )
    let correct = 0
    for (let item = 0; item < nextQuestionCount; item += 1) {
      if (random() < draw.probability) correct += 1
    }
    const nextAccuracy = (correct / nextQuestionCount) * 100
    const rate = (60 * (correct / nextQuestionCount)) / draw.secondsPerItem
    if (rate >= aim && nextAccuracy >= ACCURACY_AIM) masteryCount += 1
    nextRates.push(rate)
  }

  nextRates.sort((a, b) => a - b)

  return {
    observed,
    curve,
    next: {
      median: quantile(nextRates, 0.5),
      lower: quantile(nextRates, 0.1),
      upper: quantile(nextRates, 0.9),
    },
    masteryProbability: observed.length >= 3 ? masteryCount / simulations : null,
    ceiling: speedPosterior.ceiling,
    status: observed.length < 3 ? 'early' : observed.length < 6 ? 'developing' : 'established',
  }
}

function calculateCeleration(attempts: QuizAttempt[]) {
  const daily = new Map<string, { time: number; rate: number }>()
  attempts
    .slice()
    .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
    .forEach(attempt => {
      const time = new Date(attempt.completed_at).getTime()
      const day = new Date(time).toISOString().slice(0, 10)
      if (!daily.has(day)) daily.set(day, { time, rate: Math.max(0.1, attempt.fluency_rate) })
    })

  const values = Array.from(daily.values())
  if (values.length < 2) return null
  const first = values[0].time
  const x = values.map(value => (value.time - first) / (7 * 86_400_000))
  const y = values.map(value => Math.log10(value.rate))
  const n = x.length
  const sumX = x.reduce((sum, value) => sum + value, 0)
  const sumY = y.reduce((sum, value) => sum + value, 0)
  const sumXY = x.reduce((sum, value, index) => sum + value * y[index], 0)
  const sumX2 = x.reduce((sum, value) => sum + value * value, 0)
  const denominator = n * sumX2 - sumX * sumX
  if (!denominator) return null
  const slope = (n * sumXY - sumX * sumY) / denominator
  return { factorPerWeek: 10 ** slope, days: daily.size }
}

function FluencyTrajectory({ model, aim }: { model: BayesianModel; aim: number }) {
  const width = 920
  const height = 470
  const margin = { top: 34, right: 34, bottom: 64, left: 76 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const finalAttempt = model.curve[model.curve.length - 1]?.attempt ?? 1
  const yMaximumRaw = Math.max(
    aim * 1.35,
    ...model.observed.map(point => point.rate * 1.15),
    ...model.curve.map(point => Math.min(point.upper, aim * 4)),
  )
  const yMaximum = Math.max(5, Math.ceil(yMaximumRaw / 5) * 5)
  const xAt = (attempt: number) =>
    margin.left + ((attempt - 1) / Math.max(1, finalAttempt - 1)) * plotWidth
  const yAt = (rate: number) =>
    margin.top + plotHeight - (clamp(rate, 0, yMaximum) / yMaximum) * plotHeight
  const fitted = model.curve.filter(point => !point.forecast)
  const forecast = model.curve.filter(point => point.attempt >= model.observed.length)
  const bandPath = [
    ...model.curve.map(point => `${xAt(point.attempt)},${yAt(point.upper)}`),
    ...model.curve.slice().reverse().map(point => `${xAt(point.attempt)},${yAt(point.lower)}`),
  ].join(' ')
  const fittedPath = fitted.map(point => `${xAt(point.attempt)},${yAt(point.median)}`).join(' ')
  const forecastPath = forecast.map(point => `${xAt(point.attempt)},${yAt(point.median)}`).join(' ')
  const observedPath = model.observed.map(point => `${xAt(point.attempt)},${yAt(point.rate)}`).join(' ')
  const yTicks = Array.from({ length: 6 }, (_, index) => (yMaximum / 5) * index)
  const forecastBoundary = model.observed.length < finalAttempt
    ? (xAt(model.observed.length) + xAt(model.observed.length + 1)) / 2
    : xAt(finalAttempt)

  return (
    <div className="bl-trajectory-scroll">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="bl-trajectory-chart"
        role="img"
        aria-label="Bayesian fluency trajectory with an 80 percent credible band and a three-attempt forecast"
      >
        <defs>
          <pattern id="bl-chart-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#9aaa83" strokeWidth="0.35" opacity="0.28" />
          </pattern>
        </defs>

        <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="url(#bl-chart-grid)" stroke="#152219" />

        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={margin.left} y1={yAt(tick)} x2={width - margin.right} y2={yAt(tick)} stroke="#9aaa83" strokeWidth="0.7" opacity="0.55" />
            <text x={margin.left - 14} y={yAt(tick) + 4} textAnchor="end" className="bl-chart-tick">{tick.toFixed(0)}</text>
          </g>
        ))}

        {model.curve.map(point => (
          <g key={point.attempt}>
            <line x1={xAt(point.attempt)} y1={margin.top + plotHeight} x2={xAt(point.attempt)} y2={margin.top + plotHeight + 7} stroke="#152219" />
            <text x={xAt(point.attempt)} y={margin.top + plotHeight + 25} textAnchor="middle" className="bl-chart-tick">{point.attempt}</text>
          </g>
        ))}

        <polygon points={bandPath} className="bl-credible-band" />
        <line x1={margin.left} y1={yAt(aim)} x2={width - margin.right} y2={yAt(aim)} className="bl-aim-line" />
        <text x={width - margin.right - 5} y={yAt(aim) - 9} textAnchor="end" className="bl-aim-label">Aim {aim}/min</text>

        {model.observed.length < finalAttempt && (
          <>
            <line x1={forecastBoundary} y1={margin.top} x2={forecastBoundary} y2={margin.top + plotHeight} className="bl-forecast-boundary" />
            <text x={forecastBoundary + 10} y={margin.top + 18} className="bl-forecast-label">Forecast</text>
          </>
        )}

        {model.observed.length > 1 && <polyline points={observedPath} className="bl-observed-path" />}
        {fittedPath && <polyline points={fittedPath} className="bl-model-line" />}
        {forecastPath && <polyline points={forecastPath} className="bl-model-line bl-model-forecast" />}

        {model.observed.map(point => (
          <circle
            key={point.attempt}
            cx={xAt(point.attempt)}
            cy={yAt(point.rate)}
            r="6"
            className={point.accuracy >= ACCURACY_AIM ? 'bl-observation is-accurate' : 'bl-observation is-building'}
          >
            <title>{`Attempt ${point.attempt} · ${point.rate.toFixed(1)}/min · ${point.accuracy.toFixed(0)}% · ${formatDate(point.date)}`}</title>
          </circle>
        ))}

        <text x={margin.left + plotWidth / 2} y={height - 14} textAnchor="middle" className="bl-chart-axis">Attempt number</text>
        <text x="19" y={margin.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 19 ${margin.top + plotHeight / 2})`} className="bl-chart-axis">Correct responses per minute</text>
      </svg>
    </div>
  )
}

function AccuracyStrip({ model }: { model: BayesianModel }) {
  return (
    <div className="bl-accuracy-strip" aria-label="Accuracy by attempt">
      {model.observed.map(point => (
        <div key={point.attempt} className={point.accuracy >= ACCURACY_AIM ? 'is-accurate' : 'is-building'}>
          <span>A{String(point.attempt).padStart(2, '0')}</span>
          <strong>{point.accuracy.toFixed(0)}%</strong>
          <small>{formatDate(point.date)}</small>
        </div>
      ))}
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
    if (!user) {
      router.push('/')
      return
    }
    if (loadingRef.current) return

    const loadAttempts = async () => {
      loadingRef.current = true
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select(`
            id,
            quiz_id,
            student_name,
            total_questions,
            correct_answers,
            accuracy_percentage,
            fluency_rate,
            total_time_minutes,
            completed_at,
            quizzes!inner(title, description, response_mode)
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

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
  const model = useMemo(
    () => fitBayesianLearningCurve(selectedAttempts, fluencyAim, selectedMode),
    [selectedAttempts, fluencyAim, selectedMode],
  )
  const celeration = useMemo(() => calculateCeleration(selectedAttempts), [selectedAttempts])
  const chronological = useMemo(
    () => selectedAttempts.slice().sort(
      (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime(),
    ),
    [selectedAttempts],
  )
  const latest = chronological[chronological.length - 1]
  const bestRate = selectedAttempts.length
    ? Math.max(...selectedAttempts.map(attempt => attempt.fluency_rate))
    : 0

  if (loading) {
    return (
      <div className="bl-page bl-loading min-h-screen">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Loading performance record</p>
      </div>
    )
  }

  return (
    <div className="bl-page bl-progress-page">
      <header className="bl-header bl-category-header">
        <div className="bl-container bl-header-inner">
          <Link href="/" className="bl-wordmark" aria-label="BehaviorLingo home">
            <span className="bl-wordmark-mark">BL</span>
            <span>behavior<span>lingo</span></span>
          </Link>
          <nav className="bl-progress-nav" aria-label="Progress navigation">
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/">Home</Link>
          </nav>
        </div>
      </header>

      <main className="bl-container bl-progress-main">
        <section className="bl-progress-intro">
          <div>
            <p className="bl-kicker">Performance record</p>
            <h1>Progress, with uncertainty.</h1>
            <p>Observed timings remain visible. The curve estimates the underlying learning trajectory and forecasts the next three attempts.</p>
          </div>
          {attempts.length > 0 && (
            <label className="bl-pack-selector">
              <span>Fluency pack</span>
              <select value={selectedQuiz} onChange={event => setSelectedQuiz(event.target.value)}>
                {quizzes.map(([id, quiz]) => (
                  <option key={id} value={id}>{quiz.title} · {quiz.mode === 'typed' ? 'Typed' : 'Options'}</option>
                ))}
              </select>
            </label>
          )}
        </section>

        {attempts.length === 0 ? (
          <section className="bl-progress-empty">
            <span>NO_TIMINGS_RECORDED</span>
            <h2>Your performance record starts with a fluency timing.</h2>
            <p>Complete a pack and its accuracy, rate and duration will appear here automatically.</p>
            <button className="bl-button" onClick={() => router.push('/')}>Choose a pack <span>→</span></button>
          </section>
        ) : model && latest ? (
          <>
            <section className="bl-progress-summary" aria-label="Performance summary">
              <div>
                <span>Latest timing</span>
                <strong>{latest.fluency_rate.toFixed(1)}<small>/min</small></strong>
                <p>{latest.accuracy_percentage.toFixed(0)}% accuracy</p>
              </div>
              <div>
                <span>Predicted next</span>
                <strong>{model.next.median.toFixed(1)}<small>/min</small></strong>
                <p>80% interval {model.next.lower.toFixed(1)}–{model.next.upper.toFixed(1)}</p>
              </div>
              <div className={model.masteryProbability !== null && model.masteryProbability >= 0.7 ? 'is-positive' : ''}>
                <span>Combined aim next time</span>
                {model.masteryProbability === null ? (
                  <><strong>—</strong><p>Available after 3 timings</p></>
                ) : (
                  <><strong>{Math.round(model.masteryProbability * 100)}<small>%</small></strong><p>≥{ACCURACY_AIM}% and ≥{fluencyAim}/min</p></>
                )}
              </div>
              <div>
                <span>Best observed</span>
                <strong>{bestRate.toFixed(1)}<small>/min</small></strong>
                <p>{selectedAttempts.length} timing{selectedAttempts.length === 1 ? '' : 's'} recorded</p>
              </div>
            </section>

            <section className="bl-trajectory-panel">
              <div className="bl-panel-heading">
                <div>
                  <p className="bl-kicker">Fluency trajectory</p>
                  <h2>{selectedMeta?.title}</h2>
                </div>
                <div className="bl-model-state">
                  <i />
                  <span>{model.status === 'early' ? 'Early estimate' : model.status === 'developing' ? 'Estimate developing' : 'Estimate established'}</span>
                </div>
              </div>

              <FluencyTrajectory model={model} aim={fluencyAim} />

              <div className="bl-chart-key">
                <span><i className="bl-key-point" />Observed timing</span>
                <span><i className="bl-key-observed" />Observed path</span>
                <span><i className="bl-key-curve" />Estimated trajectory</span>
                <span><i className="bl-key-band" />80% credible band</span>
                <span><i className="bl-key-dash" />Forecast</span>
              </div>

              {model.status === 'early' && (
                <div className="bl-early-notice">
                  <strong>Early estimate</strong>
                  <span>The curve is deliberately conservative while data are sparse. The combined next-attempt probability appears after three timings.</span>
                </div>
              )}
            </section>

            <section className="bl-accuracy-panel">
              <div className="bl-panel-heading bl-panel-heading-compact">
                <div>
                  <p className="bl-kicker">Accuracy check</p>
                  <h2>Accuracy across attempts</h2>
                </div>
                <span className="bl-accuracy-aim">Aim ≥{ACCURACY_AIM}%</span>
              </div>
              <AccuracyStrip model={model} />
              <p className="bl-accuracy-note">Green timings meet the accuracy criterion. Fluency is interpreted alongside accuracy to avoid rewarding fast guessing.</p>
            </section>

            <section className="bl-history-panel">
              <div className="bl-panel-heading bl-panel-heading-compact">
                <div><p className="bl-kicker">Timing log</p><h2>Recent attempts</h2></div>
              </div>
              <div className="bl-history-scroll">
                <table>
                  <thead><tr><th>Attempt</th><th>Date</th><th>Accuracy</th><th>Correct/min</th><th>Duration</th><th>Status</th></tr></thead>
                  <tbody>
                    {chronological.slice().reverse().slice(0, 10).map((attempt, reverseIndex) => {
                      const attemptNumber = chronological.length - reverseIndex
                      const meetsAim = attempt.accuracy_percentage >= ACCURACY_AIM && attempt.fluency_rate >= fluencyAim
                      return (
                        <tr key={attempt.id}>
                          <td>A{String(attemptNumber).padStart(2, '0')}</td>
                          <td>{formatDate(attempt.completed_at)}</td>
                          <td>{attempt.accuracy_percentage.toFixed(0)}%</td>
                          <td>{attempt.fluency_rate.toFixed(1)}</td>
                          <td>{attempt.total_time_minutes.toFixed(1)} min</td>
                          <td><span className={meetsAim ? 'is-met' : 'is-building'}>{meetsAim ? 'Aim met' : 'Building'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bl-technical-panel">
              <button onClick={() => setShowTechnical(value => !value)} aria-expanded={showTechnical}>
                <span><b>Technical view</b><small>Model assumptions and celeration summary</small></span>
                <i>{showTechnical ? '−' : '+'}</i>
              </button>
              {showTechnical && (
                <div className="bl-technical-content">
                  <div>
                    <span>Bayesian model</span>
                    <strong>Accuracy and speed modelled separately</strong>
                    <p>Accuracy uses a regularised Bayesian logistic learning curve. Seconds per item use a Bayesian log-time curve. Both learning slopes are centred at zero, so improvement is not assumed in advance.</p>
                  </div>
                  <div>
                    <span>Forecast</span>
                    <strong>Next three attempts</strong>
                    <p>Correct/min is derived jointly from simulated accuracy and response speed. The forecast concerns subsequent attempts, not performance on a particular future date.</p>
                  </div>
                  <div>
                    <span>Task ceiling</span>
                    <strong>Guardrail {model.ceiling}/min</strong>
                    <p>The response-time model approaches a task-level ceiling rather than increasing indefinitely. This is a provisional mode-specific guardrail, not a claim about the learner’s personal maximum.</p>
                  </div>
                  <div>
                    <span>Calendar celeration</span>
                    <strong>{celeration ? `×${celeration.factorPerWeek.toFixed(2)} per week` : 'More days required'}</strong>
                    <p>{celeration ? `Estimated from the first timing on each of ${celeration.days} practice days.` : 'At least two separate practice days are required for a calendar-time estimate.'}</p>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}
