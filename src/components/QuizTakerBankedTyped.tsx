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

type AliasMap = Record<string, string[]>

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
  const [aliases, setAliases] = useState<AliasMap>({})

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [typed, setTyped] = useState('')

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
      .select('id, title, description, is_free, price, quiz_mode')
      .eq('quiz_mode', 'banked')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setQuizzes((data || []).filter(q => q.is_free) as Quiz[])
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    setLoading(true)
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('id, title, description, is_free, price, quiz_mode')
        .eq('id', id)
        .single()
      if (error || !quiz) throw error || new Error('Quiz not found')
      setSelectedQuiz({
        id: quiz.id, title: quiz.title, description: quiz.description, is_free: quiz.is_free, price: quiz.price,
      })
    } catch (e) {
      console.error(e)
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
      const [{ data: termData, error: tErr }, { data: qData, error: qErr }] = await Promise.all([
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
      if (tErr) throw tErr
      if (qErr) throw qErr

      // ✅ Randomize QUESTION order (only)
      const randomizedQs = shuffle(qData || [])

      // Optional aliases
      let aliasMap: AliasMap = {}
      const { data: aliasRows, error: aErr } = await supabase
        .from('quiz_term_aliases')
        .select('term_id, alias_text')
        .in('term_id', (termData || []).map(t => t.id))
      if (!aErr && aliasRows) {
        aliasMap = aliasRows.reduce((acc: AliasMap, row: any) => {
          const arr = acc[row.term_id] || []
          arr.push(row.alias_text)
          acc[row.term_id] = arr
          return acc
        }, {})
      }
      setAliases(aliasMap)

      setTerms(termData || [])
      setRemainingTerms(termData || [])
      setQuestions(randomizedQs as BankedQuestion[])
      setCurrentQuestionIndex(0)
      setTyped('')
      setShowFeedback(false)
      setHintShown(false)
      setScore(0)
      setQuizCompleted(false)
      setStartTime(new Date())

      startIdleTimers()
    } catch (err) {
      console.error('Error starting typed banked quiz:', err)
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

  const threshold = 20
  const maxBarRate = 50
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
    idleTimerRef.current = setTimeout(() => finalizeTimedOutAttempt(), IDLE_TIMEOUT_MS)
  }
  const finalizeTimedOutAttempt = async () => {
    clearIdleTimers()
    if (quizCompleted) return
    try { await saveQuizAttempt() } finally { setQuizCompleted(true) }
  }

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

    const candidates = [correctTerm.term_text, ...(aliases[correctTerm.id] || [])]
      .map(normalize)
      .filter(Boolean)

    const isCorrect = candidates.includes(t)
    return { isCorrect, matchedTermId: isCorrect ? correctTerm.id : undefined }
  }

  const submitAnswer = async () => {
    if (!currentQuestion) return

    const { isCorrect, matchedTermId } = gradeTyped()
    if (isCorrect && matchedTermId) {
      setScore(prev => prev + 1)
      setRemainingTerms(prev => prev.filter(t => t.id !== matchedTermId))
    }

    await supabase.from('student_responses').insert([{
      student_name: studentName,
      question_id: currentQuestion.id,
      selected_term_id: matchedTermId ?? null,
      free_text: typed,
      is_correct: isCorrect,
    }])

    setShowFeedback(true)
  }

  const nextQuestion = () => {
    startIdleTimers()
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setTyped('')
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

    await supabase.from('quiz_attempts').insert([{
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
    }])
  }

  const resetQuiz = () => {
    clearIdleTimers()
    setSelectedQuiz(null)
    setQuestions([])
    setTerms([])
    setRemainingTerms([])
    setAliases({})
    setCurrentQuestionIndex(0)
    setTyped('')
    setShowFeedback(false)
    setScore(0)
    setQuizCompleted(false)
    setStudentName('')
    setStartTime(null)
    setIdleWarning(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading quiz...</div>
      </div>
    )
  }

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

  if (selectedQuiz && questions.length > 0 && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="min-h-screen bg-gray-100" onMouseMove={startIdleTimers} onKeyDown={startIdleTimers}>
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
              <div className="w-full bg-gray-200 rounded h-2">
                <div
                  className={`${isAboveThreshold ? 'bg-green-500' : 'bg-red-500'} h-2 rounded transition-all duration-300`}
                  style={{ width: `${barPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-600">Target: {threshold}/min</div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 leading-relaxed text-gray-900">
                {currentQuestion.question_text}
              </h2>

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

              <div className="mb-4">
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onFocus={startIdleTimers}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 caret-gray-900 appearance-none"
                  placeholder="Type the matching term..."
                  disabled={showFeedback}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              {showFeedback && (
                <div
                  className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 ${
                    normalize(typed) && correctTerm && normalize(typed) === normalize(correctTerm.term_text)
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-red-100 border border-red-300'
                  }`}
                >
                  <div className="font-semibold mb-2 text-sm sm:text-base text-gray-900">
                    {normalize(typed) && correctTerm && normalize(typed) === normalize(correctTerm.term_text)
                      ? '✅ Correct'
                      : '❌ Incorrect'}
                  </div>
                  <div className="text-sm text-gray-800 mb-1">
                    Correct answer: <strong>{correctTerm?.term_text ?? 'Correct term'}</strong>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {currentQuestion.explanation}
                  </div>
                </div>
              )}

              <div className="flex justify-center sm:justify-end">
                {!showFeedback ? (
                  <button
                    onClick={submitAnswer}
                    disabled={typed.trim().length === 0}
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Select a Banked (Typed) Quiz</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Name:</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 caret-gray-900 appearance-none"
          placeholder="Enter your name..."
        />
      </div>

      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <p className="text-gray-600 text-center">No free banked quizzes available yet.</p>
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


