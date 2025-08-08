'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Quiz {
  id: string
  title: string
  description: string
}

interface Question {
  id: string
  question_text: string
  correct_answer: string
  explanation: string
  answer_options: {
    option_letter: string
    option_text: string
  }[]
}

export default function QuizTaker() {
  const searchParams = useSearchParams()
  const quizId = searchParams.get('id')
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // Load available quizzes or specific quiz
  useEffect(() => {
    if (quizId) {
      loadSpecificQuiz(quizId)
    } else {
      loadQuizzes()
    }
  }, [quizId])

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes(data || [])
    }
  }

  const loadSpecificQuiz = async (id: string) => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error loading specific quiz:', error)
      loadQuizzes() // Fallback to showing all quizzes
    } else {
      setSelectedQuiz(data)
    }
  }

  const startQuiz = async (quiz: Quiz) => {
    if (!studentName.trim()) {
      alert('Please enter your name first')
      return
    }

    setLoading(true)
    setSelectedQuiz(quiz)

    // Load questions with their answer options
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        correct_answer,
        explanation,
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
      // Randomize the question order
      const randomizedQuestions = [...(data || [])].sort(() => Math.random() - 0.5)
      
      setQuestions(randomizedQuestions)
      setCurrentQuestionIndex(0)
      setSelectedAnswer('')
      setShowFeedback(false)
      setScore(0)
      setQuizCompleted(false)
      setStartTime(new Date())
    }
    setLoading(false)
  }

  const submitAnswer = async () => {
    if (!selectedAnswer) {
      alert('Please select an answer')
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    if (isCorrect) {
      setScore(score + 1)
    }

    // Record the student response
    await supabase
      .from('student_responses')
      .insert([{
        student_name: studentName,
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect
      }])

    setShowFeedback(true)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer('')
      setShowFeedback(false)
    } else {
      setQuizCompleted(true)
    }
  }

  const resetQuiz = () => {
    setSelectedQuiz(null)
    setQuestions([])
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setShowFeedback(false)
    setScore(0)
    setQuizCompleted(false)
    setStudentName('')
    setStartTime(null)
  }

  // Helper function to get current fluency rate
  const getCurrentFluencyRate = () => {
    if (!startTime || score === 0) return 0
    const currentTime = new Date()
    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60)
    return score / elapsedMinutes
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading quiz...</div>
      </div>
    )
  }

  // Quiz completion screen
  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    
    // Calculate correct responses per minute using TOTAL quiz time
    const endTime = new Date()
    const totalQuizTimeMinutes = startTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) : 0
    const correctResponsesPerMinute = totalQuizTimeMinutes > 0 ? score / totalQuizTimeMinutes : 0
    
    // Threshold for rate scoring
    const threshold = 30
    const isAboveThreshold = correctResponsesPerMinute >= threshold
    const rateScore = Math.max(0, correctResponsesPerMinute - threshold)
    const maxBarWidth = 100 // Maximum additional rate above threshold for full bar
    const barPercentage = Math.min(100, (rateScore / maxBarWidth) * 100)
    
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-bold mb-4">Quiz Completed! 🎉</h2>
        
        {/* Accuracy Score */}
        <div className="mb-6">
          <div className="text-6xl mb-2">{percentage}%</div>
          <div className="text-xl mb-2">
            You scored {score} out of {questions.length} questions correctly
          </div>
          <div className="text-sm text-gray-600">
            Total time: {totalQuizTimeMinutes.toFixed(1)} minutes
          </div>
        </div>
        
        {/* Rate Score */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-xl font-semibold mb-3">Fluency Score</h3>
          <div className={`text-3xl font-bold mb-2 ${isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
            {correctResponsesPerMinute.toFixed(1)} correct/min
          </div>
          <div className="text-sm text-gray-600 mb-3">
            Threshold: {threshold} correct/min
          </div>
          
          {/* Rate Bar */}
          <div className="relative w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
            {/* Threshold line */}
            <div className="absolute left-0 top-0 w-px h-full bg-gray-400 z-10"></div>
            <div className="absolute left-0 -top-6 text-xs text-gray-600">0</div>
            
            {/* Performance bar */}
            {isAboveThreshold ? (
              <div 
                className="h-full bg-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${barPercentage}%` }}
              ></div>
            ) : (
              <div className="h-full bg-red-500 opacity-50"></div>
            )}
            
            {/* Rate indicator */}
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
              {isAboveThreshold 
                ? `+${rateScore.toFixed(1)} above threshold!` 
                : `${(threshold - correctResponsesPerMinute).toFixed(1)} below threshold`
              }
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Based on total quiz time (including time on incorrect responses)
          </div>
        </div>
        
        <button
          onClick={resetQuiz}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Take Another Quiz
        </button>
      </div>
    )
  }

  // If a specific quiz was selected from landing page, show name input and start button
  if (selectedQuiz && !questions.length) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">{selectedQuiz.title}</h1>
          <p className="text-gray-600 text-center mb-8">{selectedQuiz.description}</p>
          
          {/* Student name input */}
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

  // Quiz taking interface
  if (selectedQuiz && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const currentRate = getCurrentFluencyRate()
    
    // Fluency bar calculations
    const threshold = 30
    const maxBarRate = 60 // Show up to 60 correct/min on bar
    const barPercentage = Math.min(100, (currentRate / maxBarRate) * 100)
    const thresholdPercentage = (threshold / maxBarRate) * 100
    const isAboveThreshold = currentRate >= threshold

    return (
      <div className="flex max-w-6xl mx-auto p-6 gap-6">
        {/* Main content area */}
        <div className="flex-1">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <div className="flex gap-4">
                <span>{score} correct so far</span>
                {score > 0 && (
                  <span className={`font-medium text-lg ${
                    currentRate >= 30 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentRate.toFixed(1)} correct/min
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">{currentQuestion.question_text}</h2>

            {/* Answer options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.answer_options
                .sort((a, b) => a.option_letter.localeCompare(b.option_letter))
                .map((option) => (
                <label
                  key={option.option_letter}
                  className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnswer === option.option_letter
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${showFeedback ? 'cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option.option_letter}
                    checked={selectedAnswer === option.option_letter}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={showFeedback}
                    className="mr-3"
                  />
                  <span className="font-medium">{option.option_letter}.</span> {option.option_text}
                </label>
              ))}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className={`p-4 rounded-lg mb-6 ${
                selectedAnswer === currentQuestion.correct_answer
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
              }`}>
                <div className="font-semibold mb-2">
                  {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct!' : '❌ Incorrect'}
                </div>
                <div className="text-sm">
                  <strong>Correct Answer:</strong> {currentQuestion.correct_answer}
                </div>
                <div className="text-sm mt-2">
                  <strong>Explanation:</strong> {currentQuestion.explanation}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end">
              {!showFeedback ? (
                <button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fluency bar sidebar */}
        {score > 0 && (
          <div className="w-32 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4 text-center">Fluency Target</h3>
            
            {/* Vertical bar */}
            <div className="relative w-8 h-80 bg-gray-200 rounded-lg border-2 border-gray-300 mb-4">
              {/* Scale markings */}
              <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-600">
                <span>60</span>
                <span>45</span>
                <span className="font-bold">30</span>
                <span>15</span>
                <span>0</span>
              </div>
              
              {/* Threshold line */}
              <div 
                className="absolute left-0 right-0 h-1 bg-gray-700 z-20"
                style={{ bottom: `${thresholdPercentage}%` }}
              ></div>
              <div 
                className="absolute -right-8 text-xs text-gray-700 font-bold"
                style={{ bottom: `${thresholdPercentage - 1}%` }}
              >
                TARGET
              </div>
              
              {/* Performance bar */}
              <div 
                className={`absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-1000 ease-out ${
                  isAboveThreshold ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ height: `${barPercentage}%` }}
              ></div>
            </div>
            
            {/* Current rate display */}
            <div className="text-center">
              <div className={`text-sm font-medium ${
                isAboveThreshold ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentRate.toFixed(1)}/min
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Quiz selection screen (fallback if no specific quiz selected)
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Select a Quiz</h1>
      
      {/* Student name input */}
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

      {/* Available quizzes */}
      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <p className="text-gray-600 text-center">No quizzes available yet.</p>
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