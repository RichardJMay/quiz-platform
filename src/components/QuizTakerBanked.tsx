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

// Idle timeout (5 minutes total; warn at 4.5 minutes) — matches your original
const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const IDLE_WARNING_MS = 4.5 * 60 * 1000

export default function QuizTakerBanked() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const quizId = searchParams.get('id')
  const { user } = useAuth()

  // Quiz selection / loading (like your original)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)

  // Core quiz state
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

  // “live rate” tick (updates UI every second like a stopwatch)
  const [tick, setTick] = useState(0)

  // Idle tracking (matches your pattern)
  const [idleWarning, setIdleWarning] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------- Initial quiz load ----------
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

      // You’re running free-only right now; this just selects the quiz
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

  // ---------- Start quiz: fetch term bank + questions ----------
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

      const shuffledQs = shuffle(qData || [])

      setTerms(termData || [])
      setRemainingTerms(termData || [])
      setQuestions(shuffledQs as BankedQuestion[])
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

  // ---------- Derived per-view state ----------
  const currentQuestion: BankedQuestion | undefined = questions[currentQuestionIndex]

  // Shuffle remaining terms for each question (stable per question id)
  const shuffledOptions: Term[] = useMemo(() => {
    if (!currentQuestion) return []
    return shuffle(remainingTerms)
  }, [remainingTerms, currentQuestion?.id])

  // Live “correct/min” rate (recompute each second via `tick`)
  const getCurrentFluencyRate = () => {
    if (!startTime) return 0
    const elapsedMinutes = (Date.now() - startTime.getTime()) / (1000 * 60)
    return elapsedMinutes > 0 ? score / elapsedMinutes : 0
  }

  const currentRate = useMemo(() => getCurrentFluencyRate(), [score, startTime, tick])

  const threshold = 20 // (You can adjust per-mode if you like)
  const maxBarRate = 50
  const barPercentage = Math.min(100, (currentRate / maxBarRate) * 100)
  const isAboveThreshold = currentRate >= threshold

  // ---------- Idle helpers (same pattern as your original) ----------
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

  // Global activity listeners while running + 1s tick for live rate
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

  // ---------- Actions ----------
  const submitAnswer = async () => {
    if (!selectedTermId) {
      alert('Please select an answer')
      return
    }
    if (!currentQuestion) return

    const isCorrect = selectedTermId === currentQuestion.correct_term_id
    if (isCorrect) {
      setScore(prev => prev + 1)
      // Remove the correctly used term from future options
      setRemainingTerms(prev => prev.filter(t => t.id !== selectedTermId))
    }

    await supabase
      .from('student_responses')
      .insert([{
        student_name: studentName,
        question_id: currentQuestion.id,
        selected_term_id: selectedTermId, // banked mode selection
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
      remaining_term_ids: remainingTerms.map(t => t.id), // persist remaining options
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

  // ---------- UI STATES ----------

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading quiz...</div>
      </div>
    )
  }

  // Completion screen
  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const endTime = new Date()
    const totalQuizTimeMinutes = startTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) : 0
    const correctResponsesPerMinute = totalQuizTimeMinutes > 0 ? score / totalQuizTimeMinutes : 0

    const isAbove = correctResponsesPerMinute >= threshold
    const rateScore = Math.max(0, correctResponsesPerMinute - threshold)
    const maxBarWidth = 100
    const barPct = Math.min(100, (rateScore / maxBarWidth) * 100)

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

              <div className={`${isAbove ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 sm:p-6`}>
                <div className={`text-2xl sm:text-4xl font-bold mb-2 ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
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

                {isAbove ? (
                  <div className="h-full bg-green-500 transition-all duration-1000 ease-out" style={{ width: `${barPct}%` }} />
                ) : (
                  <div className="h-full bg-red-500 opacity-50" />
                )}

                <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                  {isAbove ? `+${rateScore.toFixed(1)} above target!` : `${(threshold - correctResponsesPerMinute).toFixed(1)} below target`}
                </div>
              </div>

              <div className="text-xs sm:text-sm text-gray-600">
                {isAbove
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
            onClick={() => startQuiz(selectedQuiz)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  // In-progress quiz UI
  if (selectedQuiz && questions.length > 0 && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const correctTerm = terms.find(t => t.id === currentQuestion.correct_term_id)

    return (
      <div className="min-h-screen bg-gray-100" onMouseMove={startIdleTimers} onKeyDown={startIdleTimers}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{selectedQuiz.title}</h1>
              <p className="text-sm text-gray-600">Definition {currentQuestionIndex + 1} of {questions.length}</p>
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
                  onClick={() => { startIdleTimers(); setIdleWarning(false) }}
                  className="ml-2 inline-flex items-center rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                >
                  I’m back
                </button>
              </div>
            )}

            {/* Progress + live rate */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-600 mb-2 gap-1 sm:gap-4">
                <span className="font-medium">Definition {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="text-sm">{score} correct so far</span>
                  <span className={`font-bold text-base sm:text-lg ${isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
                    {currentRate.toFixed(1)} correct/min
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 sm:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Optional rate bar vs threshold */}
              <div className="w-full bg-gray-200 rounded h-2">
                <div
                  className={`${isAboveThreshold ? 'bg-green-500' : 'bg-red-500'} h-2 rounded transition-all duration-300`}
                  style={{ width: `${barPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-600">Target: {threshold}/min</div>
            </div>

            {/* Definition prompt */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 leading-relaxed text-gray-900">
                {currentQuestion.question_text}
              </h2>

              {/* Hint button */}
              {(currentQuestion.hint && currentQuestion.hint.trim().length > 0) && !showFeedback && (
                <div className="mb-4">
                  <button
                    onClick={() => setHintShown(v => !v)}
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

              {/* Term options — NO LETTERS, just the term text */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {shuffledOptions.map((term) => {
                  const isSelected = selectedTermId === term.id
                  return (
                    <button
                      key={term.id}
                      type="button"
                      disabled={showFeedback}
                      onClick={() => setSelectedTermId(term.id)}
                      className={[
                        'text-left text-sm sm:text-base px-3 py-2 rounded-lg border transition select-none',
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white',
                        showFeedback ? 'cursor-not-allowed opacity-90' : ''
                      ].join(' ')}
                      aria-pressed={isSelected}
                      aria-label={`Select term ${term.term_text}`}
                    >
                      {term.term_text}
                    </button>
                  )
                })}
              </div>

              {/* Feedback */}
              {showFeedback && (
                <div
                  className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 ${
                    selectedTermId === currentQuestion.correct_term_id
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-red-100 border border-red-300'
                  }`}
                >
                  <div className="font-semibold mb-2 text-sm sm:text-base text-gray-900">
                    {selectedTermId === currentQuestion.correct_term_id ? '✅ Correct' : '❌ Incorrect'}
                  </div>
                  <div className="text-sm text-gray-800 mb-1">
                    <strong>{correctTerm?.term_text ?? 'Correct term'}</strong> is correct
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
                    onClick={submitAnswer}
                    disabled={!selectedTermId}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 sm:py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Definition' : 'Finish Quiz'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz selection screen (fallback, for when no ?id is provided)
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Select a Banked Quiz</h1>

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
            No free banked quizzes available yet.
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
