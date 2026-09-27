import { accuracyGate, type PathwayAttempt } from '../../lib/learning-stage'

export type AttemptPurpose = 'accuracy_probe' | 'accuracy_practice' | 'fluency_probe' | 'fluency_practice' | null
export type ResponseMode = 'options' | 'typed'

export interface ProgressAttempt {
  id: string
  quiz_id: string
  total_questions: number
  correct_answers: number
  accuracy_percentage: number
  fluency_rate: number
  total_time_minutes: number
  completed_at: string
  completed_day_ldn: string | null
  learner_local_date: string | null
  attempt_purpose: AttemptPurpose
  session_id: string | null
  independent: boolean | null
  assistance_used: boolean | null
  terminal_option_condition: boolean | null
  completed: boolean | null
  hint_used_any: boolean | null
  fewer_options_used: boolean | null
  quizzes: { title: string; description: string; response_mode: ResponseMode | null } | null
}

export type FluencyPoint = { attempt: ProgressAttempt; dailyProbe: boolean }
export type CumulativePoint = {
  day: string
  dailyCompleted: number
  completed: number
  accuracyMastered: number
  fluencyMastered: number
}

export const aims: Record<ResponseMode, number> = { options: 15, typed: 6 }

export function dayKey(attempt: ProgressAttempt): string {
  return attempt.learner_local_date || attempt.completed_day_ldn || attempt.completed_at.slice(0, 10)
}

export function completedAttempts(rows: readonly ProgressAttempt[]): ProgressAttempt[] {
  return rows.filter(row =>
    row.completed !== false && Boolean(row.completed_at) &&
    Number(row.total_questions) > 0 &&
    Number(row.correct_answers) >= 0 &&
    Number(row.correct_answers) <= Number(row.total_questions)
  ).slice().sort((a, b) => a.completed_at.localeCompare(b.completed_at) || a.id.localeCompare(b.id))
}

export function fluencyPoints(rows: readonly ProgressAttempt[]): FluencyPoint[] {
  const seenProbeDays = new Set<string>()
  return completedAttempts(rows).filter(row =>
    row.attempt_purpose === null || row.attempt_purpose === 'fluency_probe' || row.attempt_purpose === 'fluency_practice'
  ).filter(row => Number(row.total_time_minutes) > 0 && Number(row.total_time_minutes) <= 30)
    .map(attempt => {
      const key = `${attempt.quiz_id}:${dayKey(attempt)}`
      const dailyProbe = attempt.attempt_purpose !== 'fluency_practice' && !seenProbeDays.has(key)
      if (dailyProbe) seenProbeDays.add(key)
      return { attempt, dailyProbe }
    })
}

function asPathwayAttempt(row: ProgressAttempt): PathwayAttempt {
  return {
    purpose: row.attempt_purpose as PathwayAttempt['purpose'],
    sessionId: row.session_id || '',
    completed: row.completed === true,
    independent: row.independent === true,
    assistanceUsed: row.assistance_used !== false,
    terminalOptionCondition: row.terminal_option_condition === true,
    correctAnswers: Number(row.correct_answers),
    totalQuestions: Number(row.total_questions),
    learnerLocalDate: dayKey(row),
  }
}

/** Count unique packs once; completing another attempt never lowers a line. */
export function cumulativeRecord(rows: readonly ProgressAttempt[]): CumulativePoint[] {
  const completed = completedAttempts(rows)
  const probesByQuiz = new Map<string, PathwayAttempt[]>()
  const legacyPerfectDays = new Map<string, Set<string>>()
  const accuracyMastered = new Set<string>()
  const fluencyMastered = new Set<string>()
  const firstDailyFluency = new Set(fluencyPoints(rows).filter(point => point.dailyProbe).map(point => point.attempt.id))
  const totals = new Map<string, CumulativePoint>()

  for (const row of completed) {
    const day = dayKey(row)
    const key = row.quiz_id
    let point = totals.get(day)
    if (!point) {
      point = { day, dailyCompleted: 0, completed: 0, accuracyMastered: 0, fluencyMastered: 0 }
      totals.set(day, point)
    }
    point.dailyCompleted += 1

    if (!accuracyMastered.has(key)) {
      if (row.attempt_purpose === null && Number(row.correct_answers) === Number(row.total_questions)) {
        const days = legacyPerfectDays.get(key) || new Set<string>()
        days.add(day)
        legacyPerfectDays.set(key, days)
        if (days.size >= 2) { accuracyMastered.add(key); point.accuracyMastered += 1 }
      } else if (row.attempt_purpose !== null) {
        const probes = probesByQuiz.get(key) || []
        probes.push(asPathwayAttempt(row))
        probesByQuiz.set(key, probes)
        if (accuracyGate(probes).met) { accuracyMastered.add(key); point.accuracyMastered += 1 }
      }
    }

    const mode = row.quizzes?.response_mode === 'typed' ? 'typed' : 'options'
    if (accuracyMastered.has(key) && !fluencyMastered.has(key) && firstDailyFluency.has(row.id) &&
      Number(row.correct_answers) === Number(row.total_questions) && Number(row.fluency_rate) >= aims[mode]) {
      fluencyMastered.add(key)
      point.fluencyMastered += 1
    }
  }

  let total = 0
  let totalAccuracy = 0
  let totalFluency = 0
  return [...totals.values()].sort((a, b) => a.day.localeCompare(b.day)).map(point => {
    total += point.dailyCompleted
    totalAccuracy += point.accuracyMastered
    totalFluency += point.fluencyMastered
    return { ...point, completed: total,
      accuracyMastered: totalAccuracy, fluencyMastered: totalFluency }
  })
}
