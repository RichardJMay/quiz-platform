'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getPackGuide } from '@/lib/quiz-pathway'
import { chooseDefinitionQuestions } from '@/lib/definition-variants'
import { loadPathwayAttempts, nextAttemptContext, type AttemptContext } from '@/lib/pathway-client'
import { accuracyGate, type PathwayAttempt } from '@/lib/learning-stage'

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
  definition_variant?: number
  rephrased_definition?: string | null
}

type TimingResult = { minutes: number; rate: number; percentage: number; saved: boolean; complete: boolean }

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

export default function QuizTakerBanked({ contextPractice = false }: { contextPractice?: boolean }) {
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
  const [itemSaveFailed, setItemSaveFailed] = useState(false)
  const [responseSaving, setResponseSaving] = useState(false)
  const submittingRef = useRef(false)
  const [hintShown, setHintShown] = useState(false)
  const [hintUsedForItem, setHintUsedForItem] = useState(false)
  const [hintUsedInAttempt, setHintUsedInAttempt] = useState(false)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [assistanceUsed, setAssistanceUsed] = useState(false)
  const [fewerOptions, setFewerOptions] = useState(false)
  const [optionsReduced, setOptionsReduced] = useState(false)
  const [attemptContext, setAttemptContext] = useState<AttemptContext | null>(null)
  const [readyStage, setReadyStage] = useState<'accuracy' | 'fluency'>('accuracy')
  const [recognisedEarlierTimings, setRecognisedEarlierTimings] = useState(false)
  const [priorPathwayAttempts, setPriorPathwayAttempts] = useState<PathwayAttempt[]>([])
  const [accuracyUnlocked, setAccuracyUnlocked] = useState(false)
  const [pathwayError, setPathwayError] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [contextUnlocked, setContextUnlocked] = useState(false)
  const [contextLocked, setContextLocked] = useState(false)
  const contextAttemptId = useRef<string | null>(null)

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
  }, [quizId, contextPractice])

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, quiz_mode, is_listed')
      .eq('quiz_mode', 'banked')
      .eq('is_listed', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes((data || []) as Quiz[])
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    setContextLocked(false)
    setLoading(true)
    setPathwayError(false)
    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, quiz_mode, is_listed')
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
      })
      if (!user) throw new Error('Sign in is required to load your learning pathway')
      const { data: contextAccess, error: contextError } = await supabase.rpc('context_practice_access', { p_quiz_id: id })
      if (contextError) throw contextError
      setContextUnlocked(contextAccess === true)
      if (contextPractice && !contextAccess) {
        setContextLocked(true)
        setSelectedQuiz(null)
        return
      }
      const history = await loadPathwayAttempts(user.id, id)
      setReadyStage(history.adaptiveFluencyUnlocked || history.recognisedEarlierTimings || accuracyGate(history.attempts).met ? 'fluency' : 'accuracy')
      setRecognisedEarlierTimings(history.recognisedEarlierTimings)
    } catch (err) {
      console.error('Error loading quiz:', err)
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
      const context = nextAttemptContext(previousAttempts, user.id, quiz.id)
      if (contextPractice) { context.stage = 'fluency'; context.purpose = 'fluency_practice' }
      setReadyStage(context.stage)
      setRecognisedEarlierTimings(context.recognisedEarlierTimings)
      setPriorPathwayAttempts(previousAttempts.attempts)
      setAccuracyUnlocked(false)
      const [{ data: termData, error: termError }, { data: qData, error: qError }] = await Promise.all([
        supabase
          .from('active_quiz_terms')
          .select('id, term_text')
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('active_definition_questions')
          .select('id, question_text, explanation, hint, correct_term_id, definition_variant, rephrased_definition')
          .eq('quiz_id', quiz.id)
          .order('created_at', { ascending: true }),
      ])

      if (termError) throw termError
      if (qError) throw qError
      if (!qData?.length || !termData?.length) throw new Error('This pack has no terms or questions')

      let activeTerms = (termData || []) as Term[]
      let activeQuestions = (qData || []) as BankedQuestion[]
      if (contextPractice) {
        const { data: items, error: itemsError } = await supabase.rpc('context_practice_items', { p_quiz_id: quiz.id })
        if (itemsError) throw itemsError
        activeTerms = items.terms as Term[]
        activeQuestions = items.questions as BankedQuestion[]
        contextAttemptId.current = window.crypto.randomUUID()
      } else if (context.stage === 'accuracy') {
        activeQuestions = chooseDefinitionQuestions(activeQuestions)
      } else {
        activeQuestions = activeQuestions.filter(question => question.definition_variant === 0)
      }
      const randomizedQs = shuffle(activeQuestions)

      setTerms(activeTerms)
      setSelectedQuiz(quiz)
      setAttemptContext(context)
      setRemainingTerms(activeTerms) // fixed order; correct terms leave the bank
      setQuestions(randomizedQs as BankedQuestion[])
      setCurrentQuestionIndex(0)
      setSelectedTermId('')
      setShowFeedback(false)
      setItemSaveFailed(false)
      setResponseSaving(false)
      submittingRef.current = false
      setHintShown(false)
      setHintUsedForItem(false)
      setHintUsedInAttempt(false)
      setShowHelpMenu(false)
      setAssistanceUsed(false)
      setFewerOptions(false)
      setOptionsReduced(false)
      setScore(0)
      setQuizCompleted(false)
      setResult(null)
      finishingRef.current = false
      setStartTime(new Date())
      startIdleTimers()
    } catch (err) {
      console.error('Error starting banked quiz:', err)
      setPathwayError(true)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion: BankedQuestion | undefined = questions[currentQuestionIndex]

  // Keep the full bank stable; randomise the reduced prompt for each question.
  const options: Term[] = useMemo(() => {
    if (!currentQuestion) return []
    if (fewerOptions && attemptContext?.stage === 'accuracy') {
      const correct = remainingTerms.find(t => t.id === currentQuestion.correct_term_id)
      const distractors = remainingTerms.filter(t => t.id !== currentQuestion.correct_term_id).slice(0, 2)
      return correct ? shuffle([correct, ...distractors]) : remainingTerms
    }
    return remainingTerms
  }, [remainingTerms, currentQuestion?.id, currentQuestion?.correct_term_id, fewerOptions, attemptContext?.stage])

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
    if (finishingRef.current) return
    clearIdleTimers()
    setIdleWarning(false)
    idleWarnTimerRef.current = setTimeout(() => setIdleWarning(true), attemptContext?.stage === 'accuracy' ? 29.5 * 60 * 1000 : IDLE_WARNING_MS)
    idleTimerRef.current = setTimeout(() => {
      finalizeTimedOutAttempt()
    }, attemptContext?.stage === 'accuracy' ? 30 * 60 * 1000 : IDLE_TIMEOUT_MS)
  }

  const finalizeTimedOutAttempt = () => { void finishTiming(false) }

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
    if (!currentQuestion || !user || submittingRef.current || finishingRef.current) return
    submittingRef.current = true
    setResponseSaving(true)

    const isCorrect = selectedTermId === currentQuestion.correct_term_id
    if (isCorrect) {
      setScore(prev => prev + 1)
      // remove the correctly used term from future options (keeps original order otherwise)
      setRemainingTerms(prev => prev.filter(t => t.id !== selectedTermId))
    }

    try {
      const { error } = contextPractice
        ? await supabase.rpc('save_context_response', {
          p_attempt_id: contextAttemptId.current, p_quiz_id: selectedQuiz?.id,
          p_question_id: currentQuestion.id, p_selected_term_id: selectedTermId,
        })
        : await supabase.from('student_responses').insert([{
          user_id: user.id, student_name: studentName, question_id: currentQuestion.id,
          selected_term_id: selectedTermId, is_correct: isCorrect, hint_used: hintUsedForItem,
        }])
      if (error) throw error
    } catch (error) {
      console.error('Could not save item response:', error)
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
      setSelectedTermId('')
      setShowFeedback(false)
      setResponseSaving(false)
      submittingRef.current = false
      setHintShown(false)
      setHintUsedForItem(false)
      setShowHelpMenu(false)
      setFewerOptions(false)
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
        purpose: assistanceUsed || optionsReduced ? 'accuracy_practice' : 'accuracy_probe',
        sessionId: attemptContext.sessionId, completed: true,
        independent: !assistanceUsed && !optionsReduced,
        assistanceUsed: assistanceUsed || optionsReduced,
        terminalOptionCondition: !optionsReduced,
        correctAnswers: score, totalQuestions: questions.length,
        learnerLocalDate: attemptContext.learnerLocalDate,
      }]).met)
    }
    if (saved && !contextPractice && selectedQuiz) {
      const { data } = await supabase.rpc('context_practice_access', { p_quiz_id: selectedQuiz.id })
      setContextUnlocked(data === true)
    }
    setResult({ minutes: totalTimeMinutes, rate: fluencyRate, percentage: accuracyPercentage, saved, complete })
    setSaving(false)
    setQuizCompleted(true)
  }

  const saveQuizAttempt = async (totalTimeMinutes: number, accuracyPercentage: number, fluencyRate: number): Promise<boolean> => {
    if (!selectedQuiz || !attemptContext || !user) return false
    if (contextPractice) {
      if (!contextAttemptId.current) return false
      const { error } = await supabase.rpc('save_context_practice', {
        p_attempt_id: contextAttemptId.current, p_quiz_id: selectedQuiz.id,
        p_total: questions.length, p_correct: score, p_minutes: totalTimeMinutes,
      })
      if (error) { console.error('Could not save context timing:', error); return false }
      return true
    }
    const supported = assistanceUsed || optionsReduced
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
      attempt_purpose: attemptContext.stage === 'accuracy' && supported ? 'accuracy_practice' : attemptContext.purpose,
      session_id: attemptContext.sessionId,
      learner_local_date: attemptContext.learnerLocalDate,
      response_mode: 'options',
      independent: !supported,
      assistance_used: supported,
      terminal_option_condition: !optionsReduced,
      hint_used_any: hintUsedInAttempt,
      fewer_options_used: optionsReduced,
      completed: true,
      ...(user && { user_id: user.id })
    }

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert([attemptData])

      if (error) {
        console.error('Error saving quiz attempt:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error in saveQuizAttempt:', error)
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
    setSelectedTermId('')
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
    setOptionsReduced(false)
    setFewerOptions(false)
    setHintUsedForItem(false)
    setHintUsedInAttempt(false)
    setShowHelpMenu(false)
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

  if (contextPractice && contextLocked) {
    return <div className="bl-page bl-quiz-signin"><main className="bl-container">
      <p className="bl-kicker">Practice questions</p><h1>Build fluency first.</h1>
      <p>Complete the accuracy pathway, then reach 100% accuracy and 15 correct responses per minute in the first options timing of a day to unlock this pack’s questions.</p>
      <button className="bl-button" onClick={() => router.push(`/quiz?id=${quizId}`)}>Return to options practice →</button>
    </main></div>
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
            <button className="bl-session-wordmark" onClick={() => router.push('/')} aria-label="BehaviorLingo home">
              behavior<span>lingo</span>
            </button>
            <span className="bl-session-mode">{contextPractice ? 'Practice questions' : attemptContext?.stage === 'accuracy' ? 'Accuracy practice' : 'Options sprint'}</span>
          </div>
        </header>
        <main className="bl-session-shell bl-complete-wrap">
          <section className="bl-complete-panel">
            <p className="bl-kicker">{result.complete ? 'Session complete' : 'Session ended'}</p>
            <h1>{result.saved ? attemptContext?.stage === 'accuracy' ? 'Accuracy attempt logged.' : 'Timing logged.' : result.complete ? 'Save not confirmed.' : 'Attempt incomplete.'}</h1>
            <p className="bl-complete-lede" role="status">{result.saved
              ? 'Your latest run has been saved.'
              : result.complete
                ? 'We could not confirm that this timing was saved. Please check your progress before starting another.'
                : 'This attempt ended after inactivity and was not added to your performance record.'}</p>
            {result.saved && attemptContext?.stage === 'accuracy' && <p className="bl-complete-lede">
              {accuracyUnlocked
                ? 'You got every answer right in two separate sessions. Timed practice is now unlocked.'
                : assistanceUsed || optionsReduced
                  ? 'Prompts are for practice. Try again without a prompt when you are ready.'
                  : score === questions.length
                    ? 'Every answer right! Do this again in a separate session to unlock timed practice.'
                    : 'Keep working toward every answer right. You can use a prompt when you need one.'}
            </p>}
            {result.saved && itemSaveFailed && <p className="bl-complete-lede" role="alert">
              The attempt was saved, but one or more item responses could not be recorded.
            </p>}

            {result.complete && <div className={`bl-result-grid ${attemptContext?.stage === 'accuracy' ? 'is-accuracy' : ''}`}>
              <div className="bl-result-cell">
                <span>Accuracy</span><strong>{percentage}%</strong><small>{score}/{questions.length} correct</small>
              </div>
              {attemptContext?.stage === 'fluency' && <div className={`bl-result-cell ${!contextPractice && isAbove ? 'bl-result-on-aim' : 'bl-result-building'}`}>
                <span>{contextPractice ? 'Response rate' : 'Fluency'}</span><strong>{correctResponsesPerMinute.toFixed(1)}</strong><small>{contextPractice ? 'correct/min' : `correct/min · aim ${threshold}`}</small>
              </div>}
              <div className="bl-result-cell">
                <span>Duration</span><strong>{totalQuizTimeMinutes.toFixed(1)}</strong><small>minutes</small>
              </div>
            </div>}

            {result.complete && !contextPractice && attemptContext?.stage === 'fluency' && <div className="bl-analysis-panel">
              <div className="bl-analysis-heading">
                <div><span>Fluency aim</span><strong>{isAbove ? 'Aim reached' : 'Building toward aim'}</strong></div>
                <b>{correctResponsesPerMinute.toFixed(1)} / {threshold}</b>
              </div>
              <div className="bl-rate-track" aria-label={`Fluency rate ${correctResponsesPerMinute.toFixed(1)} correct per minute`}>
                <div className={isAbove ? 'is-on-aim' : ''} style={{ width: `${completionRateWidth}%` }} />
                <i style={{ left: `${(threshold / maxBarRate) * 100}%` }} />
              </div>
              <p>{isAbove ? 'You reached the current fluency aim. Repeat the pack to strengthen retention.' : 'Prioritise accurate responding; speed should increase as the terms become more familiar.'}</p>
            </div>}

            <div className="bl-session-actions">
              <button onClick={() => router.push('/')} className="bl-button bl-button-secondary">Return home</button>
              {user && <button onClick={() => router.push(`/progress?id=${selectedQuiz?.id}`)} className="bl-button">View progress</button>}
              {!contextPractice && contextUnlocked && <button className="bl-button" onClick={() => router.push(`/quiz?id=${selectedQuiz?.id}&stage=context`)}>Practice questions →</button>}
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
            <span className="bl-session-mode">{contextPractice ? 'Practice questions' : 'Options sprint'}</span>
          </div>
        </header>
        <main className="bl-session-shell bl-start-wrap">
          <section className="bl-start-panel">
            <div className="bl-start-copy">
              <p className="bl-kicker">{contextPractice ? 'Step 4 · Use the terms in context' : readyStage === 'accuracy' ? 'Accuracy · Get the terms right' : 'Fluency · Build speed'}</p>
              <h1>{selectedQuiz.title}</h1>
              <p>{guide?.theme || selectedQuiz.description}</p>
              {guide && <p className="bl-tasklist-codes">Task-list areas: {guide.codes}</p>}
              {user && <div className="bl-ready-label">Ready, <strong>{displayName}</strong></div>}
              {!contextPractice && readyStage === 'fluency' && recognisedEarlierTimings && <p>Earlier perfect timings count toward your progress. You can start timed practice.</p>}
            </div>
            <div className="bl-start-console">
              <span>How this pack works</span>
              <ol>
                <li><b>01</b><p>{contextPractice ? 'Read the scenario and select the term it illustrates.' : 'Match each definition to its term.'}</p></li>
                <li><b>02</b><p>Correct terms leave the bank, making the task progressively easier.</p></li>
                <li><b>03</b><p>{contextPractice ? 'Practise accurately. Your accuracy and response rate are recorded separately from definition fluency.' : readyStage === 'accuracy'
                  ? 'Get every answer right without prompts in two separate sessions. Then timed practice unlocks.'
                  : `Work accurately and build toward ${threshold} correct responses per minute.`}</p></li>
              </ol>
              <button onClick={() => startQuiz(selectedQuiz)} className="bl-button bl-start-button">{readyStage === 'accuracy' ? 'Practise the terms' : 'Start timing'} <span>→</span></button>
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
            <div className="bl-session-title"><span>{contextPractice ? 'Practice questions' : attemptContext?.stage === 'accuracy' ? 'Accuracy practice' : 'Options sprint'}</span><strong>{selectedQuiz.title}</strong></div>
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
                {attemptContext?.stage === 'fluency' && <div className={!contextPractice && isAboveThreshold ? 'is-on-aim' : ''}><span>Rate</span><strong>{currentRate.toFixed(1)} <small>/min</small></strong></div>}
                <div><span>Terms left</span><strong>{options.length}</strong></div>
              </div>
              <div className="bl-live-bars">
                <div><span>Pack progress</span><div className="bl-progress-track"><i style={{ width: `${progress}%` }} /></div></div>
                {!contextPractice && attemptContext?.stage === 'fluency' && <div><span>{`Fluency · aim ${threshold}/min`}</span><div className="bl-progress-track bl-rate-progress"><i className={!contextPractice && isAboveThreshold ? 'is-on-aim' : ''} style={{ width: `${barPercentage}%` }} /></div></div>}
              </div>
            </section>

            <section className="bl-question-panel">
              <div className="bl-question-label"><span>{contextPractice ? 'Scenario' : 'Definition'}</span><b>{String(currentQuestionIndex + 1).padStart(2, '0')}</b></div>
              <h1 className={contextPractice ? 'bl-context-question' : undefined}>{currentQuestion.question_text}</h1>

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

              {attemptContext?.stage === 'accuracy' && !showFeedback &&
                (Boolean(currentQuestion.hint?.trim()) || remainingTerms.length > 3 || fewerOptions) && <div className="bl-help-tools">
                <button type="button" className="bl-hint-toggle" aria-expanded={showHelpMenu}
                  onClick={() => setShowHelpMenu(v => !v)}>{showHelpMenu ? 'Hide prompts' : 'Need a prompt?'}</button>
                {showHelpMenu && <div className="bl-help-choices">
                  <p>You can finish this round with a prompt, but it will not unlock timed practice.</p>
                  {currentQuestion.hint?.trim() && <button type="button" className="bl-hint-toggle" onClick={() => {
                    if (!hintShown) { setHintUsedForItem(true); setHintUsedInAttempt(true); setAssistanceUsed(true) }
                    setHintShown(v => !v)
                  }}>{hintShown ? 'Hide hint' : 'Show a hint'}</button>}
                  {(remainingTerms.length > 3 || fewerOptions) && <button type="button" className="bl-hint-toggle" onClick={() => {
                    if (!fewerOptions) { setAssistanceUsed(true); setOptionsReduced(true); setSelectedTermId('') }
                    setFewerOptions(v => !v)
                  }}>{fewerOptions ? 'Show all options' : 'Show fewer options'}</button>}
                  {hintShown && <div className="bl-hint-panel">{currentQuestion.hint}</div>}
                </div>}
              </div>}

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
                    disabled={!selectedTermId || responseSaving}
                    className="bl-button"
                  >
                    {responseSaving ? 'Recording response…' : 'Check response'} <span>→</span>
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    disabled={saving}
                    className="bl-button"
                  >
                    {saving ? 'Saving attempt…' : currentQuestionIndex < questions.length - 1 ? 'Next definition' : 'Finish attempt'} <span>→</span>
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
      <div className="bl-start-copy"><p className="bl-kicker">Options practice</p><h1>{pathwayError ? contextPractice ? 'Could not load practice questions' : 'Could not load your learning pathway' : 'Select a fluency pack'}</h1>
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
