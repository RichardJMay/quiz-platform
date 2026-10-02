'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getPackGuide } from '@/lib/quiz-pathway'
import { loadPathwayAttempts, nextAttemptContext, learnerLocalDate, type AttemptContext } from '@/lib/pathway-client'
import { accuracyGate, firstLetterPrompt, fluencyPurposeForDay, type PathwayAttempt } from '@/lib/learning-stage'

interface Quiz {
  id: string
  title: string
  description: string
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

type TimingResult = { minutes: number; rate: number; percentage: number; saved: boolean; complete: boolean }

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

const normalize = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[“”‘’]/g, '"')

async function adaptiveReceptiveAccess(userId: string, typedQuizId: string) {
  const { data: link, error: linkError } = await supabase.from('adaptive_pack_links')
    .select('options_quiz_id').eq('typed_quiz_id', typedQuizId).maybeSingle()
  if (linkError) throw linkError
  if (!link) return { optionsQuizId: null, unlocked: false, recognisedEarlierTimings: false }
  const history = await loadPathwayAttempts(userId, link.options_quiz_id)
  return {
    optionsQuizId: link.options_quiz_id as string,
    unlocked: history.adaptiveFluencyUnlocked || history.recognisedEarlierTimings || accuracyGate(history.attempts).met,
    recognisedEarlierTimings: history.recognisedEarlierTimings,
  }
}

export default function QuizTakerBankedTyped() {
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
  const [typed, setTyped] = useState('')

  const [showFeedback, setShowFeedback] = useState(false)
  const [itemSaveFailed, setItemSaveFailed] = useState(false)
  const [responseSaving, setResponseSaving] = useState(false)
  const submittingRef = useRef(false)
  const [hintShown, setHintShown] = useState(false)
  const [hintUsedForItem, setHintUsedForItem] = useState(false)
  const [hintUsedInAttempt, setHintUsedInAttempt] = useState(false)
  const [assistanceUsed, setAssistanceUsed] = useState(false)
  const [attemptContext, setAttemptContext] = useState<AttemptContext | null>(null)
  const [readyStage, setReadyStage] = useState<'accuracy' | 'fluency'>('accuracy')
  const [receptiveQuizId, setReceptiveQuizId] = useState<string | null>(null)
  const [recognisedEarlierTimings, setRecognisedEarlierTimings] = useState(false)
  const [priorPathwayAttempts, setPriorPathwayAttempts] = useState<PathwayAttempt[]>([])
  const [accuracyUnlocked, setAccuracyUnlocked] = useState(false)
  const [pathwayError, setPathwayError] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<TimingResult | null>(null)
  const finishingRef = useRef(false)
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
      .select('id, title, description, quiz_mode, is_listed')
      .eq('quiz_mode', 'banked')
      .eq('is_listed', true)
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setQuizzes((data || []) as Quiz[])
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    setLoading(true)
    setPathwayError(false)
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('id, title, description, quiz_mode, is_listed')
        .eq('id', id)
        .eq('is_listed', true)
        .single()
      if (error || !quiz) throw error || new Error('Quiz not found')
      setSelectedQuiz({
        id: quiz.id, title: quiz.title, description: quiz.description,
      })
      if (!user) throw new Error('Sign in is required to load your learning pathway')
      const history = await loadPathwayAttempts(user.id, id)
      const receptive = await adaptiveReceptiveAccess(user.id, id)
      setReceptiveQuizId(receptive?.optionsQuizId ?? null)
      const unlocked = receptive.unlocked
      setReadyStage(unlocked ? 'fluency' : 'accuracy')
      setRecognisedEarlierTimings(receptive?.recognisedEarlierTimings ?? history.recognisedEarlierTimings)
    } catch (e) {
      console.error(e)
      setSelectedQuiz(null)
      setPathwayError(true)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async (quiz: Quiz) => {
    if (!user) return
    const displayName =
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Student'
    setStudentName(displayName)

    setLoading(true)
    setPathwayError(false)

    try {
      const previousAttempts = await loadPathwayAttempts(user.id, quiz.id)
      const receptive = await adaptiveReceptiveAccess(user.id, quiz.id)
      setReceptiveQuizId(receptive.optionsQuizId)
      if (!receptive.unlocked) {
        setSelectedQuiz(quiz)
        setQuestions([])
        setReadyStage('accuracy')
        return
      }
      const context = nextAttemptContext(previousAttempts, user.id, quiz.id)
      context.stage = 'fluency'
      context.purpose = fluencyPurposeForDay(previousAttempts.attempts, learnerLocalDate())
      setReadyStage(context.stage)
      setRecognisedEarlierTimings(receptive?.recognisedEarlierTimings ?? context.recognisedEarlierTimings)
      setPriorPathwayAttempts(previousAttempts.attempts)
      setAccuracyUnlocked(false)
      const [{ data: termData, error: tErr }, { data: qData, error: qErr }] = await Promise.all([
        supabase
          .from('active_quiz_terms')
          .select('id, term_text')
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('active_definition_questions')
          .select('id, question_text, explanation, hint, correct_term_id').eq('definition_variant', 0)
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
      ])
      if (tErr) throw tErr
      if (qErr) throw qErr
      if (!qData?.length || !termData?.length) throw new Error('This pack has no terms or questions')

      // ✅ Randomize QUESTION order (only)
      const randomizedQs = shuffle(qData || [])

      setTerms(termData || [])
      setSelectedQuiz(quiz)
      setAttemptContext(context)
      setRemainingTerms(termData || [])
      setQuestions(randomizedQs as BankedQuestion[])
      setCurrentQuestionIndex(0)
      setTyped('')
      setShowFeedback(false)
      setItemSaveFailed(false)
      setResponseSaving(false)
      submittingRef.current = false
      setHintShown(false)
      setHintUsedForItem(false)
      setHintUsedInAttempt(false)
      setAssistanceUsed(false)
      setScore(0)
      setQuizCompleted(false)
      setResult(null)
      finishingRef.current = false
      setStartTime(new Date())

      startIdleTimers()
    } catch (err) {
      console.error('Error starting typed banked quiz:', err)
      setPathwayError(true)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const correctTerm = useMemo(
    () => (currentQuestion ? terms.find(t => t.id === currentQuestion.correct_term_id) : undefined),
    [terms, currentQuestion?.correct_term_id]
  )

  const getCurrentFluencyRate = () => {
    if (!startTime) return 0
    const elapsedMinutes = (Date.now() - startTime.getTime()) / (1000 * 60)
    return elapsedMinutes > 0 ? score / elapsedMinutes : 0
  }
  const currentRate = useMemo(() => getCurrentFluencyRate(), [score, startTime, tick])

  const threshold = 6
  const maxBarRate = 9
  const barPercentage = Math.min(100, (currentRate / maxBarRate) * 100)
  const isAboveThreshold = currentRate >= threshold

  const clearIdleTimers = () => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    if (idleWarnTimerRef.current) { clearTimeout(idleWarnTimerRef.current); idleWarnTimerRef.current = null }
  }
  const startIdleTimers = () => {
    if (finishingRef.current) return
    clearIdleTimers()
    setIdleWarning(false)
    idleWarnTimerRef.current = setTimeout(() => setIdleWarning(true), attemptContext?.stage === 'accuracy' ? 29.5 * 60 * 1000 : IDLE_WARNING_MS)
    idleTimerRef.current = setTimeout(() => finalizeTimedOutAttempt(), attemptContext?.stage === 'accuracy' ? 30 * 60 * 1000 : IDLE_TIMEOUT_MS)
  }
  const finalizeTimedOutAttempt = () => { void finishTiming(false) }

  useEffect(() => {
    const inQuiz = !!selectedQuiz && questions.length > 0 && !quizCompleted
    if (!inQuiz) return

    const onAny = () => startIdleTimers()
    const onVisibility = () => { if (document.visibilityState === 'visible') startIdleTimers() }

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

  useEffect(() => { if (quizCompleted) clearIdleTimers() }, [quizCompleted])

  const gradeTyped = (): { isCorrect: boolean; matchedTermId?: string } => {
    if (!currentQuestion || !correctTerm) return { isCorrect: false }
    const t = normalize(typed)
    if (!t) return { isCorrect: false }

    const candidates = [correctTerm.term_text]
      .map(normalize)
      .filter(Boolean)

    const isCorrect = candidates.includes(t)
    return { isCorrect, matchedTermId: isCorrect ? correctTerm.id : undefined }
  }

  const submitAnswer = async () => {
    if (!currentQuestion || !user || submittingRef.current || finishingRef.current) return
    submittingRef.current = true
    setResponseSaving(true)

    const { isCorrect, matchedTermId } = gradeTyped()
    if (isCorrect && matchedTermId) {
      setScore(prev => prev + 1)
      setRemainingTerms(prev => prev.filter(t => t.id !== matchedTermId))
    }

    try {
      const { error } = await supabase.from('student_responses').insert([{
        user_id: user.id,
        student_name: studentName,
        question_id: currentQuestion.id,
        selected_term_id: matchedTermId ?? null,
        free_text: typed,
        is_correct: isCorrect,
        hint_used: hintUsedForItem,
      }])
      if (error) throw error
    } catch (error) {
      console.error('Could not save typed item response:', error)
      setItemSaveFailed(true)
    } finally {
      setResponseSaving(false)
      setShowFeedback(true)
    }
  }

  const nextQuestion = () => {
    startIdleTimers()
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setTyped('')
      setShowFeedback(false)
      setResponseSaving(false)
      submittingRef.current = false
      setHintShown(false)
      setHintUsedForItem(false)
    } else {
      void finishTiming(true)
    }
  }

  const finishTiming = async (complete: boolean) => {
    if (finishingRef.current || !selectedQuiz || !startTime || questions.length === 0) return
    finishingRef.current = true
    clearIdleTimers()
    const totalTimeMinutes = Math.max(0, (Date.now() - startTime.getTime()) / (1000 * 60))
    const accuracyPercentage = Math.round((score / questions.length) * 100)
    const fluencyRate = attemptContext?.stage === 'fluency' && totalTimeMinutes > 0 ? score / totalTimeMinutes : 0
    setSaving(complete)
    const saved = complete ? await saveQuizAttempt(totalTimeMinutes, accuracyPercentage, fluencyRate) : false
    if (saved && attemptContext?.stage === 'accuracy') {
      setAccuracyUnlocked(accuracyGate([...priorPathwayAttempts, {
        purpose: assistanceUsed ? 'accuracy_practice' : 'accuracy_probe',
        sessionId: attemptContext.sessionId, completed: true,
        independent: !assistanceUsed, assistanceUsed,
        terminalOptionCondition: true,
        correctAnswers: score, totalQuestions: questions.length,
        learnerLocalDate: attemptContext.learnerLocalDate,
      }]).met)
    }
    setResult({ minutes: totalTimeMinutes, rate: fluencyRate, percentage: accuracyPercentage, saved, complete })
    setSaving(false)
    setQuizCompleted(true)
  }

  const saveQuizAttempt = async (totalTimeMinutes: number, accuracyPercentage: number, fluencyRate: number): Promise<boolean> => {
    if (!selectedQuiz || !attemptContext || !user) return false
    try {
      const { error } = await supabase.from('quiz_attempts').insert([{
      user_email: user?.email || 'anonymous',
      quiz_id: selectedQuiz.id,
      student_name: studentName,
      total_questions: questions.length,
      correct_answers: score,
      accuracy_percentage: accuracyPercentage,
      fluency_rate: fluencyRate,
      total_time_minutes: totalTimeMinutes,
      remaining_term_ids: remainingTerms.map(t => t.id),
      attempt_purpose: assistanceUsed
        ? attemptContext.stage === 'accuracy' ? 'accuracy_practice' : 'fluency_practice'
        : attemptContext.purpose,
      session_id: attemptContext.sessionId,
      learner_local_date: attemptContext.learnerLocalDate,
      response_mode: 'typed',
      independent: !assistanceUsed,
      assistance_used: assistanceUsed,
      terminal_option_condition: true,
      hint_used_any: hintUsedInAttempt,
      fewer_options_used: false,
      completed: true,
      ...(user && { user_id: user.id })
      }])
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error saving typed quiz attempt:', error)
      return false
    }
  }

  const resetQuiz = () => {
    clearIdleTimers()
    setSelectedQuiz(null)
    setQuestions([])
    setTerms([])
    setRemainingTerms([])
    setCurrentQuestionIndex(0)
    setTyped('')
    setShowFeedback(false)
    setItemSaveFailed(false)
    setResponseSaving(false)
    submittingRef.current = false
    setScore(0)
    setQuizCompleted(false)
    setSaving(false)
    setResult(null)
    finishingRef.current = false
    setStudentName('')
    setStartTime(null)
    setAttemptContext(null)
    setPathwayError(false)
    setAssistanceUsed(false)
    setHintUsedForItem(false)
    setHintUsedInAttempt(false)
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

  if (quizCompleted && result) {
    const percentage = result.percentage
    const totalQuizTimeMinutes = result.minutes
    const correctResponsesPerMinute = result.rate

    const isAbove = correctResponsesPerMinute >= threshold
    const completionRateWidth = Math.min(100, (correctResponsesPerMinute / maxBarRate) * 100)

    return (
      <div className="bl-page bl-session-page">
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <button className="bl-session-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">behavior<span>lingo</span></button>
            <span className="bl-session-mode">{attemptContext?.stage === 'accuracy' ? 'Accuracy practice' : 'Typed sprint'}</span>
          </div>
        </header>
        <main className="bl-session-shell bl-complete-wrap">
          <section className="bl-complete-panel">
            <p className="bl-kicker">{result.complete ? 'Session complete' : 'Session ended'}</p>
            <h1>{result.saved ? attemptContext?.stage === 'accuracy' ? 'Accuracy attempt logged.' : 'Timing logged.' : result.complete ? 'Save not confirmed.' : 'Attempt incomplete.'}</h1>
            <p className="bl-complete-lede" role="status">{result.saved
              ? 'Your latest run has been added to your performance record.'
              : result.complete
                ? 'We could not confirm that this timing was saved. Please check your progress before starting another.'
                : 'This attempt ended after inactivity and was not added to your performance record.'}</p>
            {result.saved && attemptContext?.stage === 'accuracy' && <p className="bl-complete-lede">
              {accuracyUnlocked
                ? 'You got every answer right in two separate sessions. Timed practice is now unlocked.'
                : assistanceUsed
                  ? 'Prompts are for practice. Try again without a prompt when you are ready.'
                  : score === questions.length
                    ? 'Every answer right! Do this again in a separate session to unlock timed practice.'
                    : 'Keep working toward every answer right. You can use a prompt when you need one.'}
            </p>}
            {result.saved && attemptContext?.stage === 'fluency' && assistanceUsed && <p className="bl-complete-lede">
              Letter prompt used. This run is recorded as supported practice. Try without a prompt when you are ready.
            </p>}
            {result.saved && itemSaveFailed && <p className="bl-complete-lede" role="alert">
              The attempt was saved, but one or more item responses could not be recorded.
            </p>}

            {result.complete && <div className={`bl-result-grid ${attemptContext?.stage === 'accuracy' ? 'is-accuracy' : ''}`}>
              <div className="bl-result-cell"><span>Accuracy</span><strong>{percentage}%</strong><small>{score}/{questions.length} correct</small></div>
              {attemptContext?.stage === 'fluency' && <div className={`bl-result-cell ${isAbove ? 'bl-result-on-aim' : 'bl-result-building'}`}><span>Fluency</span><strong>{correctResponsesPerMinute.toFixed(1)}</strong><small>correct/min · aim {threshold}</small></div>}
              <div className="bl-result-cell"><span>Duration</span><strong>{totalQuizTimeMinutes.toFixed(1)}</strong><small>minutes</small></div>
            </div>}

            {result.complete && attemptContext?.stage === 'fluency' && <div className="bl-analysis-panel">
              <div className="bl-analysis-heading">
                <div><span>Fluency aim</span><strong>{isAbove ? 'Aim reached' : 'Building toward aim'}</strong></div>
                <b>{correctResponsesPerMinute.toFixed(1)} / {threshold}</b>
              </div>
              <div className="bl-rate-track" aria-label={`Fluency rate ${correctResponsesPerMinute.toFixed(1)} correct per minute`}>
                <div className={isAbove ? 'is-on-aim' : ''} style={{ width: `${completionRateWidth}%` }} />
                <i style={{ left: `${(threshold / maxBarRate) * 100}%` }} />
              </div>
              <p>{isAbove ? 'You reached the current fluency aim. Repeat the pack to strengthen retention.' : 'Prioritise accurate recall; speed should increase as retrieval becomes more fluent.'}</p>
            </div>}

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
    const guide = getPackGuide(selectedQuiz.title)

    return (
      <div className="bl-page bl-session-page">
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <button className="bl-session-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">behavior<span>lingo</span></button>
            <span className="bl-session-mode">Typed sprint</span>
          </div>
        </header>
        <main className="bl-session-shell bl-start-wrap">
          <section className="bl-start-panel">
            <div className="bl-start-copy">
              <p className="bl-kicker">Fluency · Typed retrieval</p>
              <h1>{selectedQuiz.title}</h1>
              <p>{guide?.theme || selectedQuiz.description}</p>
              {guide && <p className="bl-tasklist-codes">Task-list areas: {guide.codes}</p>}
              {user && <div className="bl-ready-label">Ready, <strong>{displayName}</strong></div>}
              {readyStage === 'fluency' && recognisedEarlierTimings && <p>Earlier perfect timings count toward your progress. You can start timed practice.</p>}
            </div>
            <div className="bl-start-console">
              {readyStage === 'accuracy' ? <>
                <span>Typed timing is locked</span>
                <p>{receptiveQuizId ? 'Learn the terms in the options pack first. When every term is ready, typed timing opens too.'
                  : 'This typed pack is not linked to an options pack yet.'}</p>
                {receptiveQuizId && <button onClick={() => router.push(`/quiz?id=${receptiveQuizId}`)} className="bl-button bl-start-button">
                  Continue options practice <span>→</span>
                </button>}
              </> : <>
              <span>How this pack works</span>
              <ol>
                <li><b>01</b><p>Read the definition and type the matching term.</p></li>
                <li><b>02</b><p>Type the term as listed in the pack. Letter case and extra spaces do not matter.</p></li>
                <li><b>03</b><p>Use the letter prompt when you need help. Prompted runs are recorded as supported practice.</p></li>
                <li><b>04</b><p>Work accurately and build toward {threshold} correct responses per minute.</p></li>
              </ol>
              <button onClick={() => startQuiz(selectedQuiz)} className="bl-button bl-start-button">Start timing <span>→</span></button>
              </>}
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (selectedQuiz && questions.length > 0 && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const typedIsCorrect = gradeTyped().isCorrect

    return (
      <div className="bl-page bl-session-page" onMouseMove={startIdleTimers} onKeyDown={startIdleTimers}>
        <header className="bl-session-topbar">
          <div className="bl-session-shell bl-session-topbar-inner">
            <div className="bl-session-title"><span>{attemptContext?.stage === 'accuracy' ? 'Accuracy practice' : 'Typed sprint'}</span><strong>{selectedQuiz.title}</strong></div>
            <button onClick={() => router.push('/')} disabled={saving} className="bl-session-exit">Exit attempt</button>
          </div>
        </header>

        <main className="bl-session-shell bl-workspace">
            {idleWarning && !quizCompleted && (
              <div className="bl-idle-warning">
                <span>You’ve been inactive. This session will end soon.</span>
                <button onClick={() => { startIdleTimers(); setIdleWarning(false) }}>Continue session</button>
              </div>
            )}

            <section className="bl-live-status">
              <div className="bl-live-metrics">
                <div><span>Item</span><strong>{String(currentQuestionIndex + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</strong></div>
                <div><span>Correct</span><strong>{score}</strong></div>
                {attemptContext?.stage === 'fluency' && <div className={isAboveThreshold ? 'is-on-aim' : ''}><span>Rate</span><strong>{currentRate.toFixed(1)} <small>/min</small></strong></div>}
                <div><span>Terms left</span><strong>{remainingTerms.length}</strong></div>
              </div>
              <div className="bl-live-bars">
                <div><span>Pack progress</span><div className="bl-progress-track"><i style={{ width: `${progress}%` }} /></div></div>
                {attemptContext?.stage === 'fluency' && <div><span>Fluency · aim {threshold}/min</span><div className="bl-progress-track bl-rate-progress"><i className={isAboveThreshold ? 'is-on-aim' : ''} style={{ width: `${barPercentage}%` }} /></div></div>}
              </div>
            </section>

            <section className="bl-question-panel bl-typed-panel">
              <div className="bl-question-label"><span>Definition</span><b>{String(currentQuestionIndex + 1).padStart(2, '0')}</b></div>
              <h1>{currentQuestion.question_text}</h1>

              <div className="bl-typed-response">
                <label htmlFor="typed-term">Matching term</label>
                <input
                  id="typed-term"
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onFocus={startIdleTimers}
                  onKeyDown={(e) => { if (e.key === 'Enter' && typed.trim() && !showFeedback) submitAnswer() }}
                  className="bl-typed-input"
                  placeholder="Type the matching term..."
                  disabled={showFeedback}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              {!showFeedback && correctTerm && <div className="bl-help-tools">
                <button type="button" className="bl-hint-toggle" aria-expanded={hintShown}
                  onClick={() => {
                    if (!hintShown) { setHintUsedForItem(true); setHintUsedInAttempt(true); setAssistanceUsed(true) }
                    setHintShown(v => !v)
                  }}>{hintShown ? 'Hide letter prompt' : 'Show letter prompt'}</button>
                {hintShown && <div className="bl-letter-prompt" role="status" aria-label="First letters and number of letters">
                  {firstLetterPrompt(correctTerm.term_text)}
                </div>}
              </div>}

              {showFeedback && (
                <div className={`bl-feedback ${typedIsCorrect ? 'is-correct' : 'is-incorrect'}`}>
                  <span>{typedIsCorrect ? 'Correct response' : 'Not quite'}</span>
                  <strong>{correctTerm?.term_text ?? 'Correct term'}</strong>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="bl-response-actions">
                {!showFeedback ? (
                  <button onClick={submitAnswer} disabled={typed.trim().length === 0 || responseSaving} className="bl-button">{responseSaving ? 'Recording response…' : 'Check response'} <span>→</span></button>
                ) : (
                  <button onClick={nextQuestion} disabled={saving} className="bl-button">{saving ? 'Saving attempt…' : currentQuestionIndex < questions.length - 1 ? 'Next definition' : 'Finish attempt'} <span>→</span></button>
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
      <div className="bl-start-copy"><p className="bl-kicker">Typed practice</p><h1>{pathwayError ? 'Could not load your learning pathway' : 'Select a fluency pack'}</h1>
        {pathwayError && <p role="alert">Please try again. No attempt has been started.</p>}
        {pathwayError && quizId && <button className="bl-button" onClick={() => loadSpecificQuiz(quizId)}>Try again</button>}
      </div>

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
              <div><h3>{quiz.title}</h3><p>{getPackGuide(quiz.title)?.theme || quiz.description}</p></div>
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
