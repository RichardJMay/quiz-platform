'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type ContextTiming = {
  id: string; total_questions: number; correct_answers: number;
  accuracy_percentage: number; fluency_rate: number; completed_at: string;
}

export default function ContextPracticeRecord({ quizId }: { quizId: string }) {
  const { user } = useAuth()
  const [record, setRecord] = useState<{ quizId: string; unlocked: boolean; rows: ContextTiming[] } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    setRecord(null)
    setFailed(false)
    if (!user) return
    const load = async () => {
      const { data: unlocked, error: accessError } = await supabase.rpc('context_practice_access', { p_quiz_id: quizId })
      if (accessError) throw accessError
      const rows: ContextTiming[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('context_practice_attempts')
          .select('id, total_questions, correct_answers, accuracy_percentage, fluency_rate, completed_at')
          .eq('user_id', user.id).eq('quiz_id', quizId)
          .order('completed_at', { ascending: false }).order('id').range(offset, offset + 499)
        if (error) throw error
        rows.push(...((data || []) as ContextTiming[]))
        if (!data || data.length < 500) break
      }
      if (active) setRecord({ quizId, unlocked: unlocked === true, rows })
    }
    void load().catch(error => { console.error('Could not load contextual practice:', error); if (active) setFailed(true) })
    return () => { active = false }
  }, [quizId, user?.id])

  const current = record?.quizId === quizId ? record : null
  return <section className="bl-history-panel bl-context-history" aria-label="Practice questions record">
    <div className="bl-panel-heading"><div><p className="bl-kicker">Practice questions</p><h2>Terms in context.</h2></div>
      {current?.unlocked && <Link className="bl-button" href={`/quiz?id=${quizId}&stage=context`}>Start practice questions →</Link>}
    </div>
    {failed ? <p role="alert">Could not load practice questions. Reload to try again.</p>
      : !current ? <p role="status">Checking practice questions…</p>
        : !current.unlocked ? <div className="bl-fluency-locked"><p>Reach 100% accuracy and 15 correct responses per minute in the first options timing of a day to unlock practice questions.</p></div>
          : <>
            <p className="bl-chart-note">These timings involve reading scenarios. They are recorded separately from definition fluency, with no response-rate aim applied.</p>
            {current.rows.length ? <>
              <p className="bl-chart-note">{current.rows.length} completed run{current.rows.length === 1 ? '' : 's'}. Showing the latest 20.</p>
              <div className="bl-history-scroll"><table>
                <thead><tr><th>Date</th><th>Correct</th><th>Accuracy</th><th>Correct/min</th></tr></thead>
                <tbody>{current.rows.slice(0, 20).map(row => <tr key={row.id}>
                  <td>{new Date(row.completed_at).toLocaleString()}</td><td>{row.correct_answers}/{row.total_questions}</td>
                  <td>{Number(row.accuracy_percentage).toFixed(1)}%</td><td>{Number(row.fluency_rate).toFixed(1)}</td>
                </tr>)}</tbody>
              </table></div>
            </> : <p>No practice-question timings yet. Your first run will appear here.</p>}
          </>}
  </section>
}
