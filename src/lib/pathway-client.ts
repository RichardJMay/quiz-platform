import { supabase } from '@/lib/supabase'
import { accuracyGate, fluencyPurposeForDay, recognisesEarlierTimings, type PathwayAttempt } from './learning-stage'

export type AttemptContext = {
  stage: 'accuracy' | 'fluency'
  purpose: 'accuracy_probe' | 'fluency_probe' | 'fluency_practice'
  sessionId: string
  learnerLocalDate: string
  recognisedEarlierTimings: boolean
}

export type PathwayHistory = {
  attempts: PathwayAttempt[]
  recognisedEarlierTimings: boolean
  adaptiveFluencyUnlocked: boolean
}

export function learnerLocalDate(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Immediate retries stay in one session. A 30-minute gap starts a new one.
export function learningSessionId(userId: string, quizId: string): string {
  const key = `behaviorlingo:session:${userId}:${quizId}`
  const now = Date.now()
  const existing = window.sessionStorage.getItem(key)
  if (existing) {
    try {
      const saved = JSON.parse(existing) as { id: string; lastStartedAt: number }
      if (saved.id && now >= saved.lastStartedAt && now - saved.lastStartedAt < 30 * 60 * 1000) {
        window.sessionStorage.setItem(key, JSON.stringify({ id: saved.id, lastStartedAt: now }))
        return saved.id
      }
    } catch { /* Start a fresh session when a stored value is invalid. */ }
  }
  const id = window.crypto.randomUUID()
  window.sessionStorage.setItem(key, JSON.stringify({ id, lastStartedAt: now }))
  return id
}

export async function loadPathwayAttempts(userId: string, quizId: string): Promise<PathwayHistory> {
  const { data: adaptiveProgress, error: adaptiveError } = await supabase
    .from('adaptive_pack_progress').select('quiz_id')
    .eq('user_id', userId).eq('quiz_id', quizId).maybeSingle()
  if (adaptiveError) throw adaptiveError
  const rows: Array<{
    attempt_purpose: string | null; session_id: string | null; completed: boolean | null;
    independent: boolean | null; assistance_used: boolean | null;
    terminal_option_condition: boolean | null; correct_answers: number | null;
    total_questions: number | null; learner_local_date: string | null;
    completed_at: string | null; completed_day_ldn: string | null;
  }> = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('quiz_attempts')
      .select('attempt_purpose, session_id, completed, independent, assistance_used, terminal_option_condition, correct_answers, total_questions, learner_local_date, completed_at, completed_day_ldn')
      .eq('user_id', userId).eq('quiz_id', quizId)
      .order('completed_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 499)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return { adaptiveFluencyUnlocked: Boolean(adaptiveProgress),
    recognisedEarlierTimings: recognisesEarlierTimings(rows), attempts: rows.filter(row => row.attempt_purpose !== null).map(row => ({
    purpose: row.attempt_purpose as PathwayAttempt['purpose'],
    sessionId: row.session_id ?? '',
    completed: row.completed === true,
    independent: row.independent === true,
    assistanceUsed: row.assistance_used !== false,
    terminalOptionCondition: row.terminal_option_condition === true,
    correctAnswers: Number(row.correct_answers),
    totalQuestions: Number(row.total_questions),
    learnerLocalDate: row.learner_local_date ?? '',
  })) }
}

export function nextAttemptContext(history: PathwayHistory, userId: string, quizId: string): AttemptContext {
  const stage = history.adaptiveFluencyUnlocked || history.recognisedEarlierTimings || accuracyGate(history.attempts).met ? 'fluency' : 'accuracy'
  const today = learnerLocalDate()
  return {
    stage,
    purpose: stage === 'accuracy' ? 'accuracy_probe' : fluencyPurposeForDay(history.attempts, today),
    learnerLocalDate: today,
    sessionId: learningSessionId(userId, quizId),
    recognisedEarlierTimings: history.recognisedEarlierTimings,
  }
}
