import type { CumulativePoint, ProgressAttempt } from './progress-records'

export type AdaptiveSessionRecord = {
  id: string
  quiz_id: string
  kind: 'baseline' | 'teaching'
  status: string
  completed_at: string | null
  quizzes: { title: string; description: string; response_mode: 'options' | 'typed' | null } | null
}

export type AdaptiveTrialRecord = {
  session_id: string
  term_id: string
  trial_type: 'baseline' | 'study' | 'teach' | 'check'
  support_level: number
  is_standard_format: boolean
  is_correct: boolean | null
  answered_at: string
}

export type AdaptiveUnlock = { quiz_id: string; fluency_unlocked_at: string }

/** Study presentations are learning events, not scored questions. */
export function adaptiveAccuracyAttempts(
  sessions: readonly AdaptiveSessionRecord[], trials: readonly AdaptiveTrialRecord[],
): ProgressAttempt[] {
  const bySession = new Map<string, AdaptiveTrialRecord[]>()
  for (const trial of trials) {
    if (trial.trial_type === 'study') continue
    const rows = bySession.get(trial.session_id) || []
    rows.push(trial)
    bySession.set(trial.session_id, rows)
  }
  return sessions.filter(session => session.status === 'completed' && session.completed_at)
    .flatMap(session => {
      const rows = bySession.get(session.id) || []
      if (!rows.length) return []
      const correct = rows.filter(row => row.is_correct === true).length
      const supported = rows.some(row => row.support_level > 0)
      return [{
        id: session.id,
        quiz_id: session.quiz_id,
        total_questions: rows.length,
        correct_answers: correct,
        accuracy_percentage: 100 * correct / rows.length,
        fluency_rate: 0,
        total_time_minutes: 0,
        completed_at: session.completed_at!,
        completed_day_ldn: null,
        learner_local_date: null,
        attempt_purpose: session.kind === 'baseline' ? 'accuracy_probe' as const : 'accuracy_practice' as const,
        session_id: session.id,
        independent: !supported,
        assistance_used: supported,
        terminal_option_condition: !supported,
        completed: true,
        hint_used_any: rows.some(row => row.support_level === 2),
        fewer_options_used: supported,
        quizzes: session.quizzes,
      }]
    })
}

export function termEvidence(trials: readonly AdaptiveTrialRecord[], completedSessionIds: ReadonlySet<string>) {
  const byTerm = new Map<string, { sessions: Set<string>; latestCorrect: boolean | null }>()
  const sorted = trials.filter(row => completedSessionIds.has(row.session_id) &&
    row.is_standard_format && row.support_level === 0 && row.is_correct !== null)
    .slice().sort((a, b) => a.answered_at.localeCompare(b.answered_at))
  for (const row of sorted) {
    const item = byTerm.get(row.term_id) || { sessions: new Set<string>(), latestCorrect: null }
    if (row.is_correct) item.sessions.add(row.session_id)
    item.latestCorrect = row.is_correct
    byTerm.set(row.term_id, item)
  }
  return byTerm
}

/** Adds adaptive completions to the existing cumulative record without
 * treating a high score on a partial teaching set as pack mastery. */
export function cumulativeWithAdaptive(
  oldPoints: readonly CumulativePoint[], sessions: readonly AdaptiveSessionRecord[],
  unlocks: readonly AdaptiveUnlock[], legacyMasteredQuizIds: ReadonlySet<string>,
): CumulativePoint[] {
  const days = new Map<string, { daily: number; accuracy: number; fluency: number }>()
  const entry = (day: string) => {
    if (!days.has(day)) days.set(day, { daily: 0, accuracy: 0, fluency: 0 })
    return days.get(day)!
  }
  let prevAccuracy = 0
  let prevFluency = 0
  for (const point of oldPoints) {
    const target = entry(point.day)
    target.daily += point.dailyCompleted
    target.accuracy += point.accuracyMastered - prevAccuracy
    target.fluency += point.fluencyMastered - prevFluency
    prevAccuracy = point.accuracyMastered
    prevFluency = point.fluencyMastered
  }
  for (const session of sessions) {
    if (session.status === 'completed' && session.completed_at) {
      entry(session.completed_at.slice(0, 10)).daily += 1
    }
  }
  const seen = new Set<string>()
  for (const unlock of unlocks) {
    if (!legacyMasteredQuizIds.has(unlock.quiz_id) && !seen.has(unlock.quiz_id)) {
      entry(unlock.fluency_unlocked_at.slice(0, 10)).accuracy += 1
      seen.add(unlock.quiz_id)
    }
  }
  let completed = 0
  let accuracyMastered = 0
  let fluencyMastered = 0
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, delta]) => {
    completed += delta.daily
    accuracyMastered += delta.accuracy
    fluencyMastered += delta.fluency
    return { day, dailyCompleted: delta.daily, completed, accuracyMastered, fluencyMastered }
  })
}
