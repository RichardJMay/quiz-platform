import { accuracyGate, recognisesEarlierTimings, type PathwayAttempt } from './learning-stage'

export type UnlockAttempt = {
  quiz_id: string
  attempt_purpose: string | null
  session_id: string | null
  completed: boolean | null
  independent: boolean | null
  assistance_used: boolean | null
  terminal_option_condition: boolean | null
  correct_answers: number | null
  total_questions: number | null
  learner_local_date: string | null
  completed_day_ldn: string | null
  completed_at: string | null
}

/** The same receptive criterion used at typed quiz entry. */
export function unlockedOptionsPacks(rows: readonly UnlockAttempt[], adaptiveUnlocked: ReadonlySet<string>) {
  const grouped = new Map<string, UnlockAttempt[]>()
  for (const row of rows) grouped.set(row.quiz_id, [...(grouped.get(row.quiz_id) || []), row])
  const unlocked = new Set(adaptiveUnlocked)
  for (const [quizId, attempts] of grouped) {
    if (recognisesEarlierTimings(attempts)) { unlocked.add(quizId); continue }
    const pathway: PathwayAttempt[] = attempts.filter(row => row.attempt_purpose !== null).map(row => ({
      purpose: row.attempt_purpose as PathwayAttempt['purpose'],
      sessionId: row.session_id ?? '',
      completed: row.completed === true,
      independent: row.independent === true,
      assistanceUsed: row.assistance_used !== false,
      terminalOptionCondition: row.terminal_option_condition === true,
      correctAnswers: Number(row.correct_answers),
      totalQuestions: Number(row.total_questions),
      learnerLocalDate: row.learner_local_date ?? row.completed_day_ldn ?? row.completed_at?.slice(0, 10) ?? '',
    }))
    if (accuracyGate(pathway).met) unlocked.add(quizId)
  }
  return unlocked
}
