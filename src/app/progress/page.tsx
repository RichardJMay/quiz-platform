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
  next: {
    accuracy: number
    secondsPerItem: number
    rate: number
  }
  status: 'limited' | 'provisional'
  quizEffectUsed: boolean
  historyObservations: number
  slopesActive: boolean
  personalised: boolean
}

const ACCURACY_AIM = 90

// These mirror the current mode-specific aims used on the pack-selection page.
// Keeping them explicit here is safer until aims are stored per quiz.
const FLUENCY_AIMS: Record<ResponseMode, number> = {
  options: 15,
  typed: 6,
}

// Frozen medians from provisional_model_bundle_v1_2.json.
// Model: zero-inflated beta-binomial accuracy + skew-normal log seconds/item.
// Validated export: 1,396 observations, 30 learners and 35 quizzes.
const MODEL_VERSION = 'behaviorlingo-log1p-zibb-skewnormal-2026-09-provisional-v1.2'
const PRACTICE_SCALE = 1.04211108380758
const GAP_SCALE = 0.962520538824282

const FIXED = {
  accuracy: {
    intercept: 1.012505,
    typed: -0.6123605,
    practice: 0.849382,
    priorAttempt: 0.3528315,
    gap: -0.186857,
    typedPractice: -0.007966005,
    typedPriorAttempt: 0.0762137,
    typedGap: -0.1475015,
    logPhi: { options: 2.69911, typed: 2.50705 },
    zeroInflation: { options: -3.211835, typed: -3.86402 },
  },
  speed: {
    intercept: 2.878825,
    typed: 0.02245765,
    practice: -0.276642,
    priorAttempt: -0.28352,
    gap: 0.1054705,
    typedPractice: 0.0827162,
    typedPriorAttempt: 0.2650775,
    typedGap: -0.114262,
    logSigma: { options: -0.730335, typed: -0.9563975 },
    alpha: { options: 4.509295, typed: 3.660595 },
  },
} as const

const LEARNER_COVARIANCE = [
  [0.8315679941245, -0.171463801632016, -0.0696040053910207, 0.0164844567164129],
  [-0.171463801632016, 0.2628920529, 0.0253283341801046, -0.0246520893293016],
  [-0.0696040053910207, 0.0253283341801046, 0.2443804395625, 0.00163217654352951],
  [0.0164844567164129, -0.0246520893293016, 0.00163217654352951, 0.00828261996946],
] as const

const MINIMUM_HISTORY_FOR_SLOPES = 6
const EXCLUDED_ATTEMPT_IDS = new Set([
  // Two known corrupt 0/36 records excluded from the fitted model.
  '157f465a-957c-46bf-b523-0b56134d5118',
  '163bbf23-690b-4530-961d-c1d2edb702b2',
])

type LearnerEffects = [number, number, number, number]

interface ModelHistoryRow {
  mode: ResponseMode
  previousAttempts: number
  practice: number
  priorAttempt: number
  gap: number
  quizId: string
  totalQuestions: number
  correctAnswers: number
  logSecondsPerItem: number
}

// Quiz-level posterior medians. Unknown/new quizzes correctly fall back to 0,
// which is the fitted population-level prediction specified by the bundle.
const QUIZ_EFFECTS: Record<string, { accuracy: number; speed: number }> = {
  '0159f04e-e611-4577-8b49-ad8df4dd71d9': { accuracy: -0.3372055, speed: 0.100508 },
  '05f7830a-ad53-4fbe-9770-dfae712bc78d': { accuracy: 0.4810155, speed: -0.09889925 },
  '1f1a1ddb-1524-411d-b25d-f1eb8707e39e': { accuracy: -0.512673, speed: 0.2142705 },
  '244d767c-a471-4fd6-95a5-8e55333bdced': { accuracy: -0.3657575, speed: 0.071687 },
  '2ed72100-24ed-46d5-9611-49d804b738af': { accuracy: 0.463009, speed: -0.2079065 },
  '3034f1cf-e0e8-40d9-9322-f6025d278b02': { accuracy: 0.1904255, speed: -0.05512495 },
  '34318c26-45df-445b-ad7f-88a599ab14ea': { accuracy: -0.154011, speed: -0.01577235 },
  '4758f35c-3081-4962-a7e4-e009d76f495e': { accuracy: 0.163768, speed: -0.0425258 },
  '49f8b8be-27f9-43c8-b88e-a6e0b31bd8e2': { accuracy: 0.497971, speed: -0.1673545 },
  '5fc9de6d-bce8-43cc-b405-6066672e1ac5': { accuracy: -0.07954075, speed: 0.0433932 },
  '71d57361-473e-466a-9b3a-d4231f853961': { accuracy: -0.158627, speed: 0.08726815 },
  '740476d7-a1e8-4864-8869-c8bf1818e6cc': { accuracy: 0.0001203005, speed: 0.03712515 },
  '75c4d39f-a60f-4648-8b14-c36d5b3f24f1': { accuracy: -0.2221915, speed: 0.0764873 },
  '7a7c4ff5-dfc9-462e-9773-1408428926ea': { accuracy: -0.1875195, speed: 0.03325965 },
  '81abf74b-9ca1-4803-bf22-f857863a23d8': { accuracy: 0.7745385, speed: -0.1095125 },
  '82ef5fa0-a116-403e-a578-3ecd55a27558': { accuracy: -0.01962825, speed: -0.01999115 },
  '856ad082-d01f-4474-8396-64112462afbe': { accuracy: 0.6240485, speed: -0.173288 },
  '9264ce1d-6067-4ca8-82b2-5f8ba5a3e166': { accuracy: 0.258036, speed: -0.0624928 },
  '93e7c730-10b4-4550-beb1-8956dfb35e0e': { accuracy: 0.02694555, speed: -0.01767325 },
  '95ac6fe3-0162-490a-8348-8970add935ed': { accuracy: -0.2807255, speed: 0.006386185 },
  '978c57e9-71f5-4d05-8156-78ef9deb89e5': { accuracy: -0.1111145, speed: 0.0131006 },
  '9ad3f157-07eb-4d59-bcda-45264342dad1': { accuracy: -0.2957535, speed: 0.07100575 },
  '9deb3c87-c92b-4558-905b-10faed4cbef3': { accuracy: -0.1472245, speed: 0.0442816 },
  'ac65303f-82ce-4258-949e-b71b608f6776': { accuracy: -0.388604, speed: 0.1651035 },
  'd6ee2ea2-ed60-421a-89fc-96143d56366e': { accuracy: -1.03739, speed: 0.287173 },
  'd7169c34-2de9-41f5-ac9a-ef1634ee3240': { accuracy: -0.2366865, speed: 0.03500695 },
  'd920a561-0329-4a08-9554-3f1c26dabaf5': { accuracy: 0.4555275, speed: -0.153196 },
  'de6a8234-a099-40b5-b936-4d50bcb540ac': { accuracy: -0.200219, speed: 0.03942035 },
  'e5997cfd-26d6-4c4c-8510-7c98bbb8e028': { accuracy: 0.133376, speed: -0.07463835 },
  'e8c2b069-cd6d-4426-aa64-4d2d351460b3': { accuracy: -0.3987605, speed: 0.105308 },
  'e92eab89-90bf-4150-b543-a777337a1456': { accuracy: 0.176443, speed: -0.055957 },
  'f1d37a23-0007-499c-bb7b-9323375d1876': { accuracy: -0.1116205, speed: 0.01045085 },
  'f4a88a23-a062-4217-9503-0b08c0a7b9c2': { accuracy: -0.0328639, speed: 0.01650175 },
  'f6829575-37e6-438b-b28e-f9feae96e8bb': { accuracy: 0.284823, speed: -0.008709015 },
  'f9278b46-1473-43e2-86da-943a0acb85b5': { accuracy: 0.741447, speed: -0.1677545 },
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const logistic = (value: number) => {
  if (value >= 0) return 1 / (1 + Math.exp(-value))
  const exponential = Math.exp(value)
  return exponential / (1 + exponential)
}

const daysBetween = (later: Date, earlier: Date) =>
  Math.max(0, (later.getTime() - earlier.getTime()) / 86_400_000)

const logGamma = (value: number): number => {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ]
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value)
  }
  const shifted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (shifted + index + 1)
  })
  const t = shifted + coefficients.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(series)
}

const logBetaBinomial = (correct: number, total: number, mu: number, phi: number) => {
  const alpha = Math.max(mu * phi, 1e-10)
  const beta = Math.max((1 - mu) * phi, 1e-10)
  return logGamma(total + 1) - logGamma(correct + 1) - logGamma(total - correct + 1) +
    logGamma(correct + alpha) + logGamma(total - correct + beta) -
    logGamma(total + alpha + beta) - logGamma(alpha) - logGamma(beta) +
    logGamma(alpha + beta)
}

// Abramowitz-Stegun approximation; adequate for the skew-normal likelihood.
const normalCdf = (value: number) => {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * erf)
}

const invertMatrix = (matrix: readonly (readonly number[])[]) => {
  const size = matrix.length
  const augmented = matrix.map((row, index) => [
    ...row,
    ...Array.from({ length: size }, (_, column) => Number(index === column)),
  ])
  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    ;[augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]
    const divisor = augmented[column][column]
    if (Math.abs(divisor) < 1e-12) throw new Error('Learner covariance is singular')
    augmented[column] = augmented[column].map(value => value / divisor)
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue
      const multiplier = augmented[row][column]
      augmented[row] = augmented[row].map((value, index) => value - multiplier * augmented[column][index])
    }
  }
  return augmented.map(row => row.slice(size))
}

const featureValues = (previousAttempts: number, gapDays: number) => ({
  practice: Math.log1p(previousAttempts) / PRACTICE_SCALE,
  priorAttempt: previousAttempts > 0 ? 1 : 0,
  gap: previousAttempts > 0 ? Math.log1p(Math.max(0, gapDays)) / GAP_SCALE : 0,
})

function fixedPredictor(
  mode: ResponseMode,
  previousAttempts: number,
  gapDays: number,
  quizId: string,
  response: 'accuracy' | 'speed',
) {
  const typed = mode === 'typed' ? 1 : 0
  const { practice, priorAttempt, gap } = featureValues(previousAttempts, gapDays)
  const terms = FIXED[response]
  const quizEffect = QUIZ_EFFECTS[quizId] ?? { accuracy: 0, speed: 0 }
  return terms.intercept + typed * terms.typed + practice * terms.practice +
    priorAttempt * terms.priorAttempt + gap * terms.gap +
    typed * practice * terms.typedPractice + typed * priorAttempt * terms.typedPriorAttempt +
    typed * gap * terms.typedGap + quizEffect[response]
}

function prepareLearnerHistory(attempts: QuizAttempt[]): ModelHistoryRow[] {
  const previousByQuiz = new Map<string, { count: number; completedAt: Date }>()
  return attempts
    .filter(attempt => {
      const questions = Number(attempt.total_questions)
      const correct = Number(attempt.correct_answers)
      const minutes = Number(attempt.total_time_minutes)
      return !EXCLUDED_ATTEMPT_IDS.has(attempt.id) && questions > 0 && correct >= 0 &&
        correct <= questions && minutes > 0 && minutes <= 30 && Boolean(attempt.completed_at)
    })
    .slice()
    .sort((a, b) => {
      const difference = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
      return difference || a.id.localeCompare(b.id)
    })
    .map(attempt => {
      const previous = previousByQuiz.get(attempt.quiz_id)
      const completedAt = new Date(attempt.completed_at)
      const previousAttempts = previous?.count ?? 0
      const gapDays = previous ? daysBetween(completedAt, previous.completedAt) : 0
      const values = featureValues(previousAttempts, gapDays)
      previousByQuiz.set(attempt.quiz_id, { count: previousAttempts + 1, completedAt })
      return {
        mode: attempt.quizzes?.response_mode === 'typed' ? 'typed' : 'options',
        previousAttempts,
        practice: values.practice,
        priorAttempt: values.priorAttempt,
        gap: values.gap,
        quizId: attempt.quiz_id,
        totalQuestions: Number(attempt.total_questions),
        correctAnswers: Number(attempt.correct_answers),
        logSecondsPerItem: Math.log(Number(attempt.total_time_minutes) * 60 / Number(attempt.total_questions)),
      }
    })
}

function learnerLogLikelihood(history: ModelHistoryRow[], effects: LearnerEffects) {
  return history.reduce((sum, row) => {
    const accuracyEta = fixedPredictor(
      row.mode, row.previousAttempts, row.priorAttempt ? Math.expm1(row.gap * GAP_SCALE) : 0,
      row.quizId, 'accuracy',
    ) + effects[0] + effects[1] * row.practice
    const mu = logistic(accuracyEta)
    const phi = Math.exp(FIXED.accuracy.logPhi[row.mode])
    const zi = logistic(FIXED.accuracy.zeroInflation[row.mode])
    const betaBinomial = logBetaBinomial(row.correctAnswers, row.totalQuestions, mu, phi)
    const accuracyLogLikelihood = row.correctAnswers === 0
      ? Math.log(zi + (1 - zi) * Math.exp(betaBinomial))
      : Math.log1p(-zi) + betaBinomial

    const speedMean = fixedPredictor(
      row.mode, row.previousAttempts, row.priorAttempt ? Math.expm1(row.gap * GAP_SCALE) : 0,
      row.quizId, 'speed',
    ) + effects[2] + effects[3] * row.practice
    const sigma = Math.exp(FIXED.speed.logSigma[row.mode])
    const alpha = FIXED.speed.alpha[row.mode]
    const delta = alpha / Math.sqrt(1 + alpha * alpha)
    const omega = sigma / Math.sqrt(1 - (2 / Math.PI) * delta * delta)
    const xi = speedMean - omega * delta * Math.sqrt(2 / Math.PI)
    const z = (row.logSecondsPerItem - xi) / omega
    const speedLogLikelihood = Math.log(2) - Math.log(omega) -
      0.5 * Math.log(2 * Math.PI) - 0.5 * z * z +
      Math.log(Math.max(normalCdf(alpha * z), 1e-300))
    return sum + accuracyLogLikelihood + speedLogLikelihood
  }, 0)
}

function minimiseBfgs(objective: (values: number[]) => number, dimensions: number) {
  let values = Array(dimensions).fill(0)
  let inverseHessian = Array.from({ length: dimensions }, (_, row) =>
    Array.from({ length: dimensions }, (_, column) => Number(row === column)))
  const gradient = (at: number[]) => at.map((value, index) => {
    const step = 1e-5 * (1 + Math.abs(value))
    const upper = at.slice(); upper[index] += step
    const lower = at.slice(); lower[index] -= step
    return (objective(upper) - objective(lower)) / (2 * step)
  })
  let current = objective(values)
  let currentGradient = gradient(values)
  for (let iteration = 0; iteration < 250; iteration += 1) {
    if (Math.max(...currentGradient.map(Math.abs)) < 1e-7) break
    let direction = inverseHessian.map(row => -row.reduce(
      (sum, entry, index) => sum + entry * currentGradient[index], 0))
    if (direction.reduce((sum, entry, index) => sum + entry * currentGradient[index], 0) >= 0) {
      direction = currentGradient.map(entry => -entry)
      inverseHessian = inverseHessian.map((row, rowIndex) => row.map((_, columnIndex) => Number(rowIndex === columnIndex)))
    }
    const directionalDerivative = direction.reduce((sum, entry, index) => sum + entry * currentGradient[index], 0)
    let step = 1
    let candidate = values.map((value, index) => value + step * direction[index])
    let candidateValue = objective(candidate)
    while ((!Number.isFinite(candidateValue) || candidateValue > current + 1e-4 * step * directionalDerivative) && step > 1e-8) {
      step *= 0.5
      candidate = values.map((value, index) => value + step * direction[index])
      candidateValue = objective(candidate)
    }
    if (step <= 1e-8) break
    const nextGradient = gradient(candidate)
    const s = candidate.map((value, index) => value - values[index])
    const y = nextGradient.map((value, index) => value - currentGradient[index])
    const sy = s.reduce((sum, entry, index) => sum + entry * y[index], 0)
    if (sy > 1e-12) {
      const rho = 1 / sy
      const identityMinusSY = inverseHessian.map((row, i) => row.map((_, j) => Number(i === j) - rho * s[i] * y[j]))
      const identityMinusYS = inverseHessian.map((row, i) => row.map((_, j) => Number(i === j) - rho * y[i] * s[j]))
      const multiplied = identityMinusSY.map(row => inverseHessian[0].map((_, j) =>
        row.reduce((sum, entry, k) => sum + entry * inverseHessian[k][j], 0)))
      inverseHessian = multiplied.map((row, i) => identityMinusYS[0].map((_, j) =>
        row.reduce((sum, entry, k) => sum + entry * identityMinusYS[k][j], 0) + rho * s[i] * s[j]))
    }
    values = candidate
    current = candidateValue
    currentGradient = nextGradient
  }
  return values
}

function estimateLearnerEffects(history: ModelHistoryRow[]): LearnerEffects {
  if (!history.length) return [0, 0, 0, 0]
  const active = history.length >= MINIMUM_HISTORY_FOR_SLOPES ? [0, 1, 2, 3] : [0, 2]
  const covariance = active.map(row => active.map(column => LEARNER_COVARIANCE[row][column]))
  const precision = invertMatrix(covariance)
  const objective = (activeValues: number[]) => {
    const effects: LearnerEffects = [0, 0, 0, 0]
    active.forEach((effectIndex, index) => { effects[effectIndex] = activeValues[index] })
    const priorPenalty = 0.5 * activeValues.reduce((outer, value, row) =>
      outer + value * activeValues.reduce((inner, other, column) => inner + precision[row][column] * other, 0), 0)
    return priorPenalty - learnerLogLikelihood(history, effects)
  }
  const fitted = minimiseBfgs(objective, active.length)
  const effects: LearnerEffects = [0, 0, 0, 0]
  active.forEach((effectIndex, index) => { effects[effectIndex] = fitted[index] })
  return effects
}

function predictNow(
  previousAttempts: number,
  gapDays: number,
  mode: ResponseMode,
  quizId: string,
  learnerEffects: LearnerEffects = [0, 0, 0, 0],
) {
  const practice = Math.log1p(previousAttempts) / PRACTICE_SCALE

  const accuracyEta = fixedPredictor(mode, previousAttempts, gapDays, quizId, 'accuracy') +
    learnerEffects[0] + learnerEffects[1] * practice
  const accuracy =
    (1 - logistic(FIXED.accuracy.zeroInflation[mode])) * logistic(accuracyEta)

  const speedLocation = fixedPredictor(mode, previousAttempts, gapDays, quizId, 'speed') +
    learnerEffects[2] + learnerEffects[3] * practice
  // brms parameterises skew_normal mu as E[log seconds/item].
  const secondsPerItem = Math.exp(speedLocation)

  return {
    accuracy: accuracy * 100,
    secondsPerItem,
    rate: (60 * accuracy) / secondsPerItem,
  }
}

function fitBayesianLearningCurve(
  attempts: QuizAttempt[],
  allLearnerAttempts: QuizAttempt[],
  _aim: number,
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
  const learnerHistory = prepareLearnerHistory(allLearnerAttempts)
  const learnerEffects = estimateLearnerEffects(learnerHistory)

  const curve: ChartPoint[] = chronological.map((attempt, index) => {
    const previous = index > 0 ? chronological[index - 1] : null
    const gapDays = previous
      ? daysBetween(new Date(attempt.completed_at), new Date(previous.completed_at))
      : 0
    return {
      attempt: index + 1,
      median: predictNow(index, gapDays, mode, attempt.quiz_id, learnerEffects).rate,
      forecast: false,
    }
  })
  const latest = chronological[chronological.length - 1]
  const next = predictNow(
    chronological.length,
    daysBetween(new Date(), new Date(latest.completed_at)),
    mode,
    latest.quiz_id,
    learnerEffects,
  )
  curve.push({ attempt: chronological.length + 1, median: next.rate, forecast: true })

  return {
    observed,
    curve,
    next,
    status: observed.length < 2 ? 'limited' : 'provisional',
    quizEffectUsed: Boolean(QUIZ_EFFECTS[latest.quiz_id]),
    historyObservations: learnerHistory.length,
    slopesActive: learnerHistory.length >= MINIMUM_HISTORY_FOR_SLOPES,
    personalised: learnerHistory.length > 0,
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
    ...model.curve.map(point => Math.min(point.median * 1.15, aim * 4)),
  )
  const yMaximum = Math.max(5, Math.ceil(yMaximumRaw / 5) * 5)
  const xAt = (attempt: number) =>
    margin.left + ((attempt - 1) / Math.max(1, finalAttempt - 1)) * plotWidth
  const yAt = (rate: number) =>
    margin.top + plotHeight - (clamp(rate, 0, yMaximum) / yMaximum) * plotHeight
  const fitted = model.curve.filter(point => !point.forecast)
  const forecast = model.curve.filter(point => point.attempt >= model.observed.length)
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
        aria-label="Provisional Bayesian fluency trajectory with a point forecast for an attempt now"
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

        <line x1={margin.left} y1={yAt(aim)} x2={width - margin.right} y2={yAt(aim)} className="bl-aim-line" />
        <text x={width - margin.right - 5} y={yAt(aim) - 9} textAnchor="end" className="bl-aim-label">Aim {aim}/min</text>

        {model.observed.length < finalAttempt && (
          <>
            <line x1={forecastBoundary} y1={margin.top} x2={forecastBoundary} y2={margin.top + plotHeight} className="bl-forecast-boundary" />
            <text x={forecastBoundary + 10} y={margin.top + 18} className="bl-forecast-label">If attempted now</text>
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
    () => fitBayesianLearningCurve(selectedAttempts, attempts, fluencyAim, selectedMode),
    [selectedAttempts, attempts, fluencyAim, selectedMode],
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
            <h1>Progress, modelled cautiously.</h1>
            <p>Observed timings remain visible. The provisional model uses this learner’s eligible history to estimate how they would perform if they attempted the selected quiz now.</p>
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
                <span>Predicted now</span>
                <strong>{model.next.rate.toFixed(1)}<small>/min</small></strong>
                <p>Provisional point estimate</p>
              </div>
              <div className={model.next.accuracy >= ACCURACY_AIM ? 'is-positive' : ''}>
                <span>Predicted accuracy now</span>
                <strong>{model.next.accuracy.toFixed(0)}<small>%</small></strong>
                <p>{model.next.accuracy >= ACCURACY_AIM ? 'Accuracy aim met' : `Aim ≥${ACCURACY_AIM}%`}</p>
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
                  <span>{model.status === 'limited' ? 'Limited history' : 'Provisional estimate'}</span>
                </div>
              </div>

              <FluencyTrajectory model={model} aim={fluencyAim} />

              <div className="bl-chart-key">
                <span><i className="bl-key-point" />Observed timing</span>
                <span><i className="bl-key-observed" />Observed path</span>
                <span><i className="bl-key-curve" />Personalised model fit</span>
                <span><i className="bl-key-dash" />If attempted now</span>
              </div>

              {model.status === 'limited' && (
                <div className="bl-early-notice">
                  <strong>Limited history</strong>
                  <span>This quiz has fewer than two previous attempts. The learner adjustment uses all eligible timings, but quiz-specific practice history remains limited.</span>
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
                    <strong>Zero-inflated accuracy + skew-normal speed</strong>
                    <p>Accuracy uses a zero-inflated beta-binomial model. Log seconds per item use a skew-normal model. Both include mode, log practice, prior-attempt and time-gap effects.</p>
                  </div>
                  <div>
                    <span>Prediction target</span>
                    <strong>If this quiz were attempted now</strong>
                    <p>The elapsed time since the latest attempt is included. Correct/min is derived from the modelled accuracy and typical seconds per item.</p>
                  </div>
                  <div>
                    <span>Identity handling</span>
                    <strong>{model.personalised ? 'Current learner updated' : 'Population estimate'}</strong>
                    <p>{model.personalised
                      ? `${model.historyObservations} eligible timing${model.historyObservations === 1 ? '' : 's'} update the population prior. ${model.slopesActive ? 'Learner intercepts and practice slopes are active.' : 'With fewer than six timings, only shrunk learner intercepts are active.'}`
                      : 'No eligible timing is available, so learner effects remain at the population prior.'}</p>
                  </div>
                  <div>
                    <span>Quiz handling</span>
                    <strong>{model.quizEffectUsed ? 'Known quiz effect used' : 'New quiz fallback'}</strong>
                    <p>{model.quizEffectUsed ? 'The fitted quiz adjustment is included.' : 'This quiz was not in the training data, so its quiz effect is set to the population mean.'}</p>
                  </div>
                  <div>
                    <span>Calendar celeration</span>
                    <strong>{celeration ? `×${celeration.factorPerWeek.toFixed(2)} per week` : 'More days required'}</strong>
                    <p>{celeration ? `Estimated from the first timing on each of ${celeration.days} practice days.` : 'At least two separate practice days are required for a calendar-time estimate.'}</p>
                  </div>
                  <div>
                    <span>Deployment status</span>
                    <strong>Provisional deployment allowed</strong>
                    <p>{MODEL_VERSION}. Personalisation uses penalised empirical-Bayes updating. A numerical uncertainty interval and precise joint-aim probability are withheld until forward-validation calibration is complete.</p>
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
