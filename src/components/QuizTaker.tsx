'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { executeAuthQuery } from '@/lib/supabase-utils'

interface Quiz {
  id: string
  title: string
  description: string
  is_free: boolean
  price: number
}

interface AnswerOption {
  option_letter: string
  option_text: string
}

interface Question {
  id: string
  question_text: string
  correct_answer: string // canonical letter from sheet, e.g., "B"
  explanation: string    // letter-free prose
  hint?: string | null
  answer_options: AnswerOption[]
}

const LETTERS = ['A','B','C','D','E','F']

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Idle timeout (5 minutes total; warn at 4.5 minutes)
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;     // 300,000 ms
const IDLE_WARNING_MS = 4.5 * 60 * 1000;   // 270,000 ms

export default function QuizTaker() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const quizId = searchParams.get('id')
  const { user } = useAuth()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('') // canonical letter
  const [showFeedback, setShowFeedback] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(false)
  const checkingAccessPromise = useRef<Promise<boolean> | null>(null)

  // ===== Idle tracking state/refs =====
  const [idleWarning, setIdleWarning] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Load available quizzes or specific quiz
  useEffect(() => {
    if (quizId) {
      loadSpecificQuiz(quizId)
    } else {
      loadQuizzes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  // Re-check access after login if needed
  useEffect(() => {
    if (selectedQuiz && !selectedQuiz.is_free && user && !accessError) {
      checkQuizAccess(selectedQuiz.id).then(hasAccess => {
        if (!hasAccess) {
          setAccessError('You need to purchase this quiz to access it.')
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Only trigger on user ID changes

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, is_free, price')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      const freeQuizzes = (data || []).filter(quiz => quiz.is_free)
      setQuizzes(freeQuizzes)
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    setCheckingAccess(true)
    setAccessError(null)

    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, description, is_free, price')
        .eq('id', id)
        .single()

      if (quizError || !quiz) {
        console.error('Error loading specific quiz:', quizError)
        setAccessError('Quiz not found.')
        setCheckingAccess(false)
        return
      }

      if (quiz.is_free) {
        setSelectedQuiz(quiz)
        setCheckingAccess(false)
        return
      }

      const hasAccess = await checkQuizAccess(id)
      if (hasAccess) {
        setSelectedQuiz(quiz)
      } else {
        setAccessError(
          user
            ? 'You need to purchase this quiz to access it. Please return to the main page to purchase.'
            : 'This is a paid quiz. Please return to the main page to purchase access.'
        )
      }
    } catch (error) {
      console.error('Error checking quiz access:', error)
      setAccessError('Error checking quiz access. Please try again.')
    } finally {
      setCheckingAccess(false)
    }
  }

  const checkQuizAccess = async (quizId: string): Promise<boolean> => {
    if (checkingAccessPromise.current) {
      return await checkingAccessPromise.current
    }

    checkingAccessPromise.current = (async () => {
      try {
        if (user) {
          const userResult = await executeAuthQuery(async () => {
            return await supabase
              .from('purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('quiz_id', quizId)
              .eq('status', 'completed')
              .single()
          })

          if (userResult.data) return true

          const emailResult = await executeAuthQuery(async () => {
            return await supabase
              .from('purchases')
              .select('id')
              .eq('user_email', user.email)
              .eq('quiz_id', quizId)
              .eq('status', 'completed')
              .single()
          })

          if (emailResult.data) return true
        }

        const sessionId = searchParams.get('session_id')
        if (sessionId) {
          try {
            const response = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })
            if (response.ok) {
              const data = await response.json()
              if (data.quizId === quizId) return true
            }
          } catch (error) {
            console.error('Error verifying payment session:', error)
          }
        }

        const token = searchParams.get('token')
        if (token) {
          const tokenResult = await executeAuthQuery(async () => {
            return await supabase
              .from('quiz_access_tokens')
              .select('quiz_id, expires_at')
              .eq('token', token)
              .eq('quiz_id', quizId)
              .single()
          })

          if (tokenResult.data && new Date(tokenResult.data.expires_at) > new Date()) {
            return true
          }
        }

        return false
      } finally {
        setTimeout(() => {
          checkingAccessPromise.current = null
        }, 100)
      }
    })()

    return await checkingAccessPromise.current
  }

  const startQuiz = async (quiz: Quiz) => {
    const displayName =
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'Student'
    setStudentName(displayName)

    setLoading(true)
    setSelectedQuiz(quiz)

    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        correct_answer,
        explanation,
        hint,
        answer_options (
          option_letter,
          option_text
        )
      `)
      .eq('quiz_id', quiz.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading questions:', error)
    } else {
      const randomizedQuestions = [...(data || [])].sort(() => Math.random() - 0.5)
      setQuestions(randomizedQuestions)
      setCurrentQuestionIndex(0)
      setSelectedAnswer('')
      setShowFeedback(false)
      setHintShown(false)
      setScore(0)
      setQuizCompleted(false)
      setStartTime(new Date())

      // kick off idle timers
      lastActivityRef.current = Date.now()
      startIdleTimers()
    }
    setLoading(false)
  }

  // ---------- Derived per-view state (safe hooks at top level) ----------
  const currentQuestion: Question | undefined = questions[currentQuestionIndex]

  // Only include options that have text
  const presentOptions: AnswerOption[] = useMemo(
    () => (currentQuestion
      ? currentQuestion.answer_options.filter(o => (o.option_text ?? '').trim().length > 0)
      : []),
    [currentQuestion?.id]
  )

  // Shuffled options for the current question (by view)
  const shuffledOptions: AnswerOption[] = useMemo(
    () => shuffle(presentOptions),
    // depend only on question id so the order is stable while on this question
    [currentQuestion?.id]
  )

  // Map from canonical -> display letter after shuffle
  const canonicalToDisplay: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    shuffledOptions.forEach((opt, idx) => {
      m[opt.option_letter] = LETTERS[idx] // e.g., if canonical "B" ended up last => B -> D
    })
    return m
  }, [shuffledOptions])

  // ===== Idle helpers =====
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

  const markActivity = () => {
    lastActivityRef.current = Date.now()
    startIdleTimers()
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

  // Install global activity listeners only while in a running quiz
  useEffect(() => {
    const inQuiz = !!selectedQuiz && questions.length > 0 && !quizCompleted
    if (!inQuiz) return

    const onAny = () => markActivity()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') markActivity()
    }

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
    }
  }, [selectedQuiz?.id, questions.length, quizCompleted])

  useEffect(() => {
    if (quizCompleted) clearIdleTimers()
  }, [quizCompleted])

  // ---------------------------------------------------------------------

  const submitAnswer = async () => {
    if (!selectedAnswer) {
      alert('Please select an answer')
      return
    }
    if (!currentQuestion) return

    markActivity()

    const isCorrect = selectedAnswer === currentQuestion.correct_answer
    if (isCorrect) setScore(prev => prev + 1)

    await supabase
      .from('student_responses')
      .insert([{
        student_name: studentName,
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer, // canonical letter for offline analysis
        is_correct: isCorrect
        // If you add a JSONB column "option_order" you can log the order shown:
        // option_order: shuffledOptions.map(o => o.option_letter)
      }])

    setShowFeedback(true)
  }

  const nextQuestion = () => {
    markActivity()
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer('')
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
      ...(user && { user_id: user.id })
    }

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert([attemptData])

      if (error) {
        console.error('Error saving quiz attempt:', error)
      } else {
        console.log('Quiz attempt saved successfully')
      }
    } catch (error) {
      console.error('Error in saveQuizAttempt:', error)
    }
  }

  const resetQuiz = () => {
    clearIdleTimers()
    setSelectedQuiz(null)
    setQuestions([])
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setShowFeedback(false)
    setScore(0)
    setQuizCompleted(false)
    setStudentName('')
    setStartTime(null)
    setAccessError(null)
    setIdleWarning(false)
  }

  const getCurrentFluencyRate = () => {
    if (!startTime || score === 0) return 0
    const currentTime = new Date()
    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60)
    return score / elapsedMinutes
  }

  // Access error screen
  if (accessError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Access Required</h2>
          <p className="text-red-700 mb-6">{accessError}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Main Page
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (checkingAccess || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">
          {checkingAccess ? 'Checking quiz access...' : 'Loading quiz...'}
        </div>
      </div>
    )
  }

  // Completion screen
  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const endTime = new Date()
    const totalQuizTimeMinutes = startTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) : 0
    const correctResponsesPerMinute = totalQuizTimeMinutes > 0 ? score / totalQuizTimeMinutes : 0

    const threshold = 20
    const isAboveThreshold = correctResponsesPerMinute >= threshold
    const rateScore = Math.max(0, correctResponsesPerMinute - threshold)
    const maxBarWidth = 100
    const barPercentage = Math.min(100, (rateScore / maxBarWidth) * 100)

    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-lg text-center p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Quiz Completed! 🎉</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                <div className="text-4xl sm:text-6xl font-bold mb-2 text-blue-600">{percentage}%</div>
                <div className="text-sm sm:text-base text-gray-700">Accuracy</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  {score} out of {questions.length} correct
                </div>
              </div>

              <div className={`${isAboveThreshold ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 sm:p-6`}>
                <div className={`text-2xl sm:text-4xl font-bold mb-2 ${isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
                  {correctResponsesPerMinute.toFixed(1)}
                </div>
                <div className="text-sm sm:text-base text-gray-700">Correct/min</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Target: {threshold}/min</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 sm:p-6">
                <div className="text-2xl sm:text-4xl font-bold mb-2 text-purple-600">
                  {totalQuizTimeMinutes.toFixed(1)}
                </div>
                <div className="text-sm sm:text-base text-gray-700">Minutes</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Total time</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900">Performance Analysis</h3>

              <div className="relative w-full h-6 sm:h-8 bg-gray-200 rounded-lg overflow-hidden mb-3">
                <div className="absolute left-0 top-0 w-px h-full bg-gray-400 z-10"></div>

                {isAboveThreshold ? (
                  <div className="h-full bg-green-500 transition-all duration-1000 ease-out" style={{ width: `${barPercentage}%` }} />
                ) : (
                  <div className="h-full bg-red-500 opacity-50" />
                )}

                <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                  {isAboveThreshold ? `+${rateScore.toFixed(1)} above target!` : `${(threshold - correctResponsesPerMinute).toFixed(1)} below target`}
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600">
                {isAboveThreshold
                  ? "Excellent fluency! You're answering quickly and accurately."
                  : "Focus on building speed while maintaining accuracy."}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Return Home
              </button>

              {user && (
                <button
                  onClick={() => router.push('/progress')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  View Progress History
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Start screen for a specific quiz
  if (selectedQuiz && questions.length === 0) {
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">{selectedQuiz.title}</h1>
          <p className="text-gray-600 text-center mb-8">{selectedQuiz.description}</p>

          {user && <p className="text-center text-gray-700 mb-6">Ready to start, {displayName}?</p>}

          <button
            onClick={() => { markActivity(); startQuiz(selectedQuiz) }}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  // Quiz taking interface
  if (selectedQuiz && questions.length > 0 && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const currentRate = getCurrentFluencyRate()

    const threshold = 20
    const maxBarRate = 50
    const barPercentage = Math.min(100, (currentRate / maxBarRate) * 100)
    const isAboveThreshold = currentRate >= threshold

    const displayCorrectLetter =
      canonicalToDisplay[currentQuestion.correct_answer] ?? currentQuestion.correct_answer

    return (
      <div className="min-h-screen bg-gray-100" onMouseMove={markActivity} onKeyDown={markActivity}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{selectedQuiz.title}</h1>
              <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              Return Home
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="w-full">
            {/* Idle warning */}
            {idleWarning && !quizCompleted && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
                You’ve been inactive for a while. The quiz will end soon unless you continue.
                <button
                  onClick={() => { markActivity(); setIdleWarning(false) }}
                  className="ml-2 inline-flex items-center rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                >
                  I’m back
                </button>
              </div>
            )}

            {/* Progress */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-600 mb-2 gap-1 sm:gap-4">
                <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="text-sm">{score} correct so far</span>
                  {score > 0 && (
                    <span className={`font-bold text-base sm:text-lg ${isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
                      {currentRate.toFixed(1)} correct/min
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2">
                <div
                  className="bg-blue-600 h-2 sm:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 leading-relaxed text-gray-900">
                {currentQuestion.question_text}
              </h2>

              {/* Hint button */}
              {(currentQuestion.hint && currentQuestion.hint.trim().length > 0) && !showFeedback && (
                <div className="mb-4">
                  <button
                    onClick={() => { setHintShown(v => !v); markActivity() }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    {hintShown ? 'Hide Hint' : 'Show Hint'}
                  </button>
                  {hintShown && (
                    <div className="mt-3 text-sm bg-purple-50 border border-purple-200 text-purple-900 rounded p-3">
                      {currentQuestion.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Answer options (display letters by position, values use canonical letters) */}
              <div className="space-y-3 mb-4 sm:mb-6">
                {shuffledOptions.map((option, i) => {
                  const displayLetter = LETTERS[i]
                  return (
                    <label
                      key={option.option_letter}
                      className={`block p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAnswer === option.option_letter
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${showFeedback ? 'cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option.option_letter} // canonical letter
                        checked={selectedAnswer === option.option_letter}
                        onChange={(e) => { setSelectedAnswer(e.target.value); markActivity() }}
                        disabled={showFeedback}
                        className="mr-3 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-sm sm:text-base text-gray-900 leading-relaxed">
                        <span className="font-medium">{displayLetter}.</span> {option.option_text}
                      </span>
                    </label>
                  )
                })}
              </div>

              {/* Feedback */}
              {showFeedback && (
                <div
                  className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 ${
                    selectedAnswer === currentQuestion.correct_answer
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-red-100 border border-red-300'
                  }`}
                >
                  <div className="font-semibold mb-2 text-sm sm:text-base text-gray-900">
                    {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct' : '❌ Incorrect'}
                  </div>
                  <div className="text-sm text-gray-800 mb-1">
                    <strong>{displayCorrectLetter} is correct</strong>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {currentQuestion.explanation}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center sm:justify-end">
                {!showFeedback ? (
                  <button
                    onClick={() => { markActivity(); submitAnswer() }}
                    disabled={!selectedAnswer}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={() => { markActivity(); nextQuestion() }}
                    className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 sm:py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz selection screen (fallback)
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Select a Quiz</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Name:</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your name..."
        />
      </div>

      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <p className="text-gray-600 text-center">
            No free quizzes available. Please return to the main page to purchase premium quizzes.
          </p>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
              <p className="text-gray-600 mb-4">{quiz.description}</p>
              <button
                onClick={() => startQuiz(quiz)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Quiz
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
