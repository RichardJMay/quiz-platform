'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Quiz {
  id: string
  title: string
  description: string
  is_free: boolean
  price: number
}

interface Term {
  id: string
  term_text: string
}

interface BankedQuestion {
  id: string
  question_text: string   // definition
  explanation: string
  hint?: string | null
  correct_term_id: string
}

// Fisher–Yates
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const IDLE_WARNING_MS = 4.5 * 60 * 1000

export default function QuizTakerBanked() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const quizId = searchParams.get('id')
  const { user } = useAuth()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)

  const [questions, setQuestions] = useState<BankedQuestion[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [remainingTerms, setRemainingTerms] = useState<Term[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedTermId, setSelectedTermId] = useState<string>('')

  const [showFeedback, setShowFeedback] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [studentName, setStudentName] = useState('')

  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)

  const [tick, setTick] = useState(0)

  const [idleWarning, setIdleWarning] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (quizId) {
      loadSpecificQuiz(quizId)
    } else {
      loadQuizzes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, is_free, price, quiz_mode, is_listed')
      .eq('quiz_mode', 'banked')
      .eq('is_listed', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      const freeQuizzes = (data || []).filter(q => q.is_free)
      setQuizzes(freeQuizzes as Quiz[])
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    setLoading(true)
    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, is_free, price, quiz_mode, is_listed')
        .eq('id', id)
        .eq('is_listed', true)
        .single()

      if (quizError || !quiz) {
        console.error('Error loading specific quiz:', quizError)
        setSelectedQuiz(null)
        return
      }

      setSelectedQuiz({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        is_free: quiz.is_free,
        price: quiz.price,
      })
    } catch (err) {
      console.error('Error loading quiz:', err)
      setSelectedQuiz(null)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async (quiz: Quiz) => {
    const displayName =
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Student'
    setStudentName(displayName)

    setLoading(true)
    setSelectedQuiz(quiz)

    try {
      const [{ data: termData, error: termError }, { data: qData, error: qError }] = await Promise.all([
        supabase
          .from('quiz_term_bank')
          .select('id, term_text')
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('questions')
          .select('id, question_text, explanation, hint, correct_term_id')
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
      ])

      if (termError) throw termError
      if (qError) throw qError

      // ✅ Randomize QUESTION order (only)
      const randomizedQs = shuffle(qData || [])

      setTerms(termData || [])
      setRemainingTerms(termData || []) // keep natural order for options
      setQuestions(randomizedQs as BankedQuestion[])
      setCurrentQuestionIndex(0)
      setSelectedTermId('')
      setShowFeedback(false)
      setHintShown(false)
      setScore(0)
      setQuizCompleted(false)
      setStartTime(new Date())
      startIdleTimers()
    } catch (err) {
      console.error('Error starting banked quiz:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion: BankedQuestion | undefined = questions[currentQuestionIndex]

  // ❌ DO NOT randomize options — show in stable (bank) order
  const options: Term[] = useMemo(() => {
    if (!currentQuestion) return []
    return remainingTerms
  }, [remainingTerms, currentQuestion?.id])

  const getCurrentFluencyRate = () => {
    if (!startTime) return 0
    const elapsedMinutes = (Date.now() - startTime.getTime()) / (1000 * 60)
    return elapsedMinutes > 0 ? score / elapsedMinutes : 0
  }

  const currentRate = useMemo(() => getCurrentFluencyRate(), [score, startTime, tick])

  const threshold = 15
  const maxBarRate = 24
  const barPercentage = Math.min(100, (currentRate / maxBarRate) * 100)
  const isAboveThreshold = currentRate >= threshold

  const clearIdleTimers = () => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    if (idleWarnTimerRef.current) { clearTimeout(idleWarnTimerRef.current); idleWarnTimerRef.current = null }
  }

  const startIdleTimers = () => {
    clearIdleTimers()
    setIdleWarning(false)
    idleWarnTimerRef.current = setTimeout(() => setIdleWarning(true), IDLE_WARNING_MS)
    idleTimerRef.current = setTimeout(() => {
      finalizeTimedOutAttempt()
    }, IDLE_TIMEOUT_MS)
  }

  const finalizeTimedOutAttempt = async () => {
    clearIdleTimers()
    if (quizCompleted) return
    try {
      await saveQuizAttempt()
    } finally {
      setQuizCompleted(true)
    }
  }

  useEffect(() => {
    const inQuiz = !!selectedQuiz && questions.length > 0 && !quizCompleted
    if (!inQuiz) return

    const onAny = () => startIdleTimers()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') startIdleTimers()
    }

    const id = setInterval(() => setTick(t => t + 1), 1000)

    startIdleTimers()
    window.addEventListener('mousemove', onAny, { passive: true })
    window.addEventListener('keydown', onAny)
    window.addEventListener('click', onAny)
    window.addEventListener('touchstart', onAny, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('mousemove', onAny)
      window.removeEventListener('keydown', onAny)
      window.removeEventListener('click', onAny)
      window.removeEventListener('touchstart', onAny)
      document.removeEventListener('visibilitychange', onVisibility)
      clearIdleTimers()
      clearInterval(id)
    }
  }, [selectedQuiz?.id, questions.length, quizCompleted])

  useEffect(() => {
    if (quizCompleted) clearIdleTimers()
  }, [quizCompleted])

  const submitAnswer = async () => {
    if (!selectedTermId) {
      alert('Please select an answer')
      return
    }
    if (!currentQuestion) return

    const isCorrect = selectedTermId === currentQuestion.correct_term_id
    if (isCorrect) {
      setScore(prev => prev + 1)
      // remove the correctly used term from future options (keeps original order otherwise)
      setRemainingTerms(prev => prev.filter(t => t.id !== selectedTermId))
    }

    await supabase
      .from('student_responses')
      .insert([{
        student_name: studentName,
        question_id: currentQuestion.id,
        selected_term_id: selectedTermId,
        is_correct: isCorrect,
      }])

    setShowFeedback(true)
  }

  const nextQuestion = () => {
    startIdleTimers()
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedTermId('')
      setShowFeedback(false)
      setHintShown(false)
    } else {
      saveQuizAttempt()
      setQuizCompleted(true)
    }
  }

  const saveQuizAttempt = async () => {
    if (!selectedQuiz || !startTime) return

    const endTime = new Date()
    const totalTimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    const accuracyPercentage = Math.round((score / questions.length) * 100)
    const fluencyRate = totalTimeMinutes > 0 ? score / totalTimeMinutes : 0

    const attemptData = {
      user_email: user?.email || 'anonymous',
      quiz_id: selectedQuiz.id,
      student_name: studentName,
      total_questions: questions.length,
      correct_answers: score,
      accuracy_percentage: accuracyPercentage,
      fluency_rate: fluencyRate,
      total_time_minutes: totalTimeMinutes,
      remaining_term_ids: remainingTerms.map(t => t.id),
      ...(user && { user_id: user.id })
    }

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert([attemptData])

      if (error) {
        console.error('Error saving quiz attempt:', error)
      }
    } catch (error) {
      console.error('Error in saveQuizAttempt:', error)
    }
  }

  const resetQuiz = () => {
    clearIdleTimers()
    setSelectedQuiz(null)
    setQuestions([])
    setTerms([])
    setRemainingTerms([])
    setCurrentQuestionIndex(0)
    setSelectedTermId('')
    setShowFeedback(false)
    setScore(0)
    setQuizCompleted(false)
    setStudentName('')
    setStartTime(null)
    setIdleWarning(false)
  }

  if (loading) {
    return (
      <div className="bl-page bl-loading min-h-screen">
        <div className="bl-loader" aria-hidden="true"><span /><span /><span /><span /></div>
        <p className="bl-kicker">Loading term bank</p>
      </div>
    )
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const endTime = new Date()
    const totalQuizTimeMinutes = startTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) : 0
    const correctResponsesPerMinute = totalQuizTimeMinutes > 0 ? score / totalQuizTimeMinutes : 0

    const isAbove = correctResponsesPerMinute >= threshold
    const completionRateWidth = Math.min(100, (correctResponsesPerMinute / maxBarRate) * 100)

    return (
      <div className="bl-page bl-session-page">
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <button className="bl-session-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">
              behavior<span>lingo</span>
            </button>
            <span className="bl-session-mode">Options sprint</span>
          </div>
        </header>
        <main className="bl-session-shell bl-complete-wrap">
          <section className="bl-complete-panel">
            <p className="bl-kicker">Session complete</p>
            <h1>Timing logged.</h1>
            <p className="bl-complete-lede">Your latest run has been added to your performance record.</p>

            <div className="bl-result-grid">
              <div className="bl-result-cell">
                <span>Accuracy</span><strong>{percentage}%</strong><small>{score}/{questions.length} correct</small>
              </div>
              <div className={`bl-result-cell ${isAbove ? 'bl-result-on-aim' : 'bl-result-building'}`}>
                <span>Fluency</span><strong>{correctResponsesPerMinute.toFixed(1)}</strong><small>correct/min · aim {threshold}</small>
              </div>
              <div className="bl-result-cell">
                <span>Duration</span><strong>{totalQuizTimeMinutes.toFixed(1)}</strong><small>minutes</small>
              </div>
            </div>

            <div className="bl-analysis-panel">
              <div className="bl-analysis-heading">
                <div><span>Fluency aim</span><strong>{isAbove ? 'Aim reached' : 'Building toward aim'}</strong></div>
                <b>{correctResponsesPerMinute.toFixed(1)} / {threshold}</b>
              </div>
              <div className="bl-rate-track" aria-label={`Fluency rate ${correctResponsesPerMinute.toFixed(1)} correct per minute`}>
                <div className={isAbove ? 'is-on-aim' : ''} style={{ width: `${completionRateWidth}%` }} />
                <i style={{ left: `${(threshold / maxBarRate) * 100}%` }} />
              </div>
              <p>{isAbove ? 'You reached the current fluency aim. Repeat the pack to strengthen retention.' : 'Prioritise accurate responding; speed should increase as the terms become more familiar.'}</p>
            </div>

            <div className="bl-session-actions">
              <button onClick={() => router.push('/')} className="bl-button bl-button-secondary">Return home</button>
              {user && <button onClick={() => router.push('/progress')} className="bl-button">View progress</button>}
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (selectedQuiz && questions.length === 0) {
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'

    return (
      <div className="bl-page bl-session-page">
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <button className="bl-session-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">behavior<span>lingo</span></button>
            <span className="bl-session-mode">Options sprint</span>
          </div>
        </header>
        <main className="bl-session-shell bl-start-wrap">
          <section className="bl-start-panel">
            <div className="bl-start-copy">
              <p className="bl-kicker">Fluency timing · Options</p>
              <h1>{selectedQuiz.title}</h1>
              <p>{selectedQuiz.description}</p>
              {user && <div className="bl-ready-label">Ready, <strong>{displayName}</strong></div>}
            </div>
            <div className="bl-start-console">
              <span>How this timing works</span>
              <ol>
                <li><b>01</b><p>Match each definition to its term.</p></li>
                <li><b>02</b><p>Correct terms leave the bank, making the task progressively easier.</p></li>
                <li><b>03</b><p>Work accurately and build toward {threshold} correct responses per minute.</p></li>
              </ol>
              <button onClick={() => startQuiz(selectedQuiz)} className="bl-button bl-start-button">Start timing <span>→</span></button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (selectedQuiz && questions.length > 0 && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const correctTerm = terms.find(t => t.id === currentQuestion.correct_term_id)

    return (
      <div className="bl-page bl-session-page" onMouseMove={startIdleTimers} onKeyDown={startIdleTimers}>
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <div className="bl-session-title"><span>Options sprint</span><strong>{selectedQuiz.title}</strong></div>
            <button onClick={() => router.push('/')} className="bl-session-exit">Exit timing</button>
          </div>
        </header>

        <main className="bl-session-shell bl-workspace">
            {idleWarning && !quizCompleted && (
              <div className="bl-idle-warning">
                <span>You’ve been inactive. This timing will end soon.</span>
                <button onClick={() => { startIdleTimers(); setIdleWarning(false) }}>Continue session</button>
              </div>
            )}

            <section className="bl-live-status">
              <div className="bl-live-metrics">
                <div><span>Item</span><strong>{String(currentQuestionIndex + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</strong></div>
                <div><span>Correct</span><strong>{score}</strong></div>
                <div className={isAboveThreshold ? 'is-on-aim' : ''}><span>Rate</span><strong>{currentRate.toFixed(1)} <small>/min</small></strong></div>
                <div><span>Terms left</span><strong>{options.length}</strong></div>
              </div>
              <div className="bl-live-bars">
                <div><span>Pack progress</span><div className="bl-progress-track"><i style={{ width: `${progress}%` }} /></div></div>
                <div><span>Fluency · aim {threshold}/min</span><div className="bl-progress-track bl-rate-progress"><i className={isAboveThreshold ? 'is-on-aim' : ''} style={{ width: `${barPercentage}%` }} /></div></div>
              </div>
            </section>

            <section className="bl-question-panel">
              <div className="bl-question-label"><span>Definition</span><b>{String(currentQuestionIndex + 1).padStart(2, '0')}</b></div>
              <h1>{currentQuestion.question_text}</h1>

              {(currentQuestion.hint && currentQuestion.hint.trim().length > 0) && !showFeedback && (
                <div className="bl-hint-wrap">
                  <button onClick={() => setHintShown(v => !v)} className="bl-hint-toggle">
                    {hintShown ? 'Hide Hint' : 'Show Hint'}
                  </button>
                  {hintShown && <div className="bl-hint-panel">{currentQuestion.hint}</div>}
                </div>
              )}

              <div className="bl-option-bank" aria-label="Term options">
                {options.map((term) => {
                  const isSelected = selectedTermId === term.id
                  return (
                    <button
                      key={term.id}
                      type="button"
                      disabled={showFeedback}
                      onClick={() => setSelectedTermId(term.id)}
                      className={`bl-term-option ${isSelected ? 'is-selected' : ''}`}
                      aria-pressed={isSelected}
                      aria-label={`Select term ${term.term_text}`}
                    >
                      {term.term_text}
                    </button>
                  )
                })}
              </div>

              {showFeedback && (
                <div className={`bl-feedback ${selectedTermId === currentQuestion.correct_term_id ? 'is-correct' : 'is-incorrect'}`}>
                  <span>{selectedTermId === currentQuestion.correct_term_id ? 'Correct response' : 'Not quite'}</span>
                  <strong>{correctTerm?.term_text ?? 'Correct term'}</strong>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="bl-response-actions">
                {!showFeedback ? (
                  <button
                    onClick={submitAnswer}
                    disabled={!selectedTermId}
                    className="bl-button"
                  >
                    Check response <span>→</span>
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="bl-button"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next definition' : 'Finish timing'} <span>→</span>
                  </button>
                )}
              </div>
            </section>
        </main>
      </div>
    )
  }

  return (
    <div className="bl-page bl-session-page">
      <main className="bl-session-shell bl-start-wrap">
      <section className="bl-start-panel bl-selection-panel">
      <div className="bl-start-copy"><p className="bl-kicker">Options practice</p><h1>Select a fluency pack</h1></div>

      <div className="bl-name-field">
        <label>Your name</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="bl-typed-input"
          placeholder="Enter your name..."
        />
      </div>

      <div className="bl-selection-list">
        {quizzes.length === 0 ? (
          <p>No fluency packs are available yet.</p>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="bl-selection-item">
              <div><h3>{quiz.title}</h3><p>{quiz.description}</p></div>
              <button onClick={() => startQuiz(quiz)} className="bl-button">Start <span>→</span></button>
            </div>
          ))
        )}
      </div>
      </section>
      </main>
    </div>
  )
}
