/**
 * Rules for the accuracy-to-fluency pathway. Pass records in chronological order
 * for one learner and one quiz. Historical attempts without pathway metadata
 * must not be converted into independent probes.
 */
export type AttemptPurpose =
  | 'accuracy_probe'
  | 'accuracy_practice'
  | 'fluency_probe'
  | 'fluency_practice'

export type LearningStage = 'accuracy' | 'fluency'

/** First letter of each word, with one slot for every remaining letter. */
export function firstLetterPrompt(term: string): string {
  let firstLetter = true
  return Array.from(term).map(character => {
    if (/\p{L}/u.test(character)) {
      const visible = firstLetter
      firstLetter = false
      return visible ? character.toLocaleUpperCase() : '_'
    }
    firstLetter = true
    return character
  }).join('')
}

type LegacyAttempt = {
  attempt_purpose: string | null
  correct_answers: number | null
  total_questions: number | null
  completed_at: string | null
  completed_day_ldn: string | null
}

/** A transition allowance for existing learners, not proof of unassisted probes. */
export function recognisesEarlierTimings(rows: readonly LegacyAttempt[]): boolean {
  const days = new Set<string>()
  for (const row of rows) {
    if (row.attempt_purpose !== null || !row.completed_at) continue
    const total = Number(row.total_questions)
    if (total <= 0 || Number(row.correct_answers) !== total) continue
    days.add(row.completed_day_ldn || row.completed_at.slice(0, 10))
    if (days.size >= 2) return true
  }
  return false
}

export interface PathwayAttempt {
  purpose: AttemptPurpose
  sessionId: string
  completed: boolean
  independent: boolean
  assistanceUsed: boolean
  terminalOptionCondition: boolean
  correctAnswers: number
  totalQuestions: number
  /** Calendar date in the learner's time zone, formatted YYYY-MM-DD. */
  learnerLocalDate: string
}

export interface AccuracyGate {
  met: boolean
  consecutiveSessions: number
}

/** Supported practice has no effect on the independent accuracy sequence. */
export function accuracyGate(attempts: readonly PathwayAttempt[]): AccuracyGate {
  let consecutiveSessions = 0
  let previousSessionId: string | null = null

  for (const attempt of attempts) {
    if (attempt.purpose !== 'accuracy_probe') continue

    const passed = attempt.completed && attempt.independent &&
      !attempt.assistanceUsed && attempt.terminalOptionCondition &&
      attempt.totalQuestions > 0 &&
      attempt.correctAnswers === attempt.totalQuestions &&
      Boolean(attempt.sessionId)

    if (!passed) {
      consecutiveSessions = 0
      previousSessionId = null
      continue
    }

    if (attempt.sessionId !== previousSessionId) {
      consecutiveSessions += 1
    }
    previousSessionId = attempt.sessionId

    // The gate is permanent once achieved; later timings belong to fluency.
    if (consecutiveSessions >= 2) return { met: true, consecutiveSessions: 2 }
  }

  return { met: false, consecutiveSessions }
}

export function learningStage(attempts: readonly PathwayAttempt[]): LearningStage {
  return accuracyGate(attempts).met ? 'fluency' : 'accuracy'
}

/**
 * Call only when beginning an independent, unassisted, timed attempt.
 * A completed earlier daily probe makes subsequent timings practice.
 */
export function fluencyPurposeForDay(
  attempts: readonly PathwayAttempt[], learnerLocalDate: string
): 'fluency_probe' | 'fluency_practice' {
  const hasProbe = attempts.some(attempt =>
    attempt.purpose === 'fluency_probe' &&
    attempt.learnerLocalDate === learnerLocalDate &&
    attempt.completed && attempt.independent && !attempt.assistanceUsed
  )
  return hasProbe ? 'fluency_practice' : 'fluency_probe'
}
