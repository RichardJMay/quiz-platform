'use client'

import { useState, useEffect, useRef } from 'react'
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
 const router = useRouter()
 const quizId = searchParams.get('id')
 const { user } = useAuth()
 
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
 const [accessError, setAccessError] = useState<string | null>(null)
 const [checkingAccess, setCheckingAccess] = useState(false)
 const checkingAccessPromise = useRef<Promise<boolean> | null>(null)


 // Load available quizzes or specific quiz
 useEffect(() => {
   if (quizId) {
     loadSpecificQuiz(quizId)
   } else {
     loadQuizzes()
   }
 }, [quizId])

 // Add a separate effect for user changes if needed
 useEffect(() => {
   // Only re-check access if we already have a selected quiz and user just logged in
   if (selectedQuiz && !selectedQuiz.is_free && user && !accessError) {
     checkQuizAccess(selectedQuiz.id).then(hasAccess => {
       if (!hasAccess) {
         setAccessError('You need to purchase this quiz to access it.')
       }
     })
   }
 }, [user?.id]) // Only trigger on actual user ID changes, not object updates

 const loadQuizzes = async () => {
   const { data, error } = await supabase
     .from('quizzes')
     .select('id, title, description, is_free, price')
     .order('created_at', { ascending: false })

   if (error) {
     console.error('Error loading quizzes:', error)
   } else {
     // Filter to only show free quizzes in the quiz taker
     const freeQuizzes = (data || []).filter(quiz => quiz.is_free)
     setQuizzes(freeQuizzes)
   }
 }

 const loadSpecificQuiz = async (id: string) => {
   setCheckingAccess(true)
   setAccessError(null)

   try {
     // First, get the quiz details
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

     // If quiz is free, allow access
     if (quiz.is_free) {
       setSelectedQuiz(quiz)
       setCheckingAccess(false)
       return
     }

     // For paid quizzes, check if user has access
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
    // If already checking, wait for that check to complete
    if (checkingAccessPromise.current) {
      console.log('Quiz access check already in progress, waiting...')
      return await checkingAccessPromise.current
    }
    
    // Create new promise for this check
    checkingAccessPromise.current = (async () => {
      console.log('Checking quiz access for:', { userId: user?.id, userEmail: user?.email, quizId })
      
      try {
        // Check for authenticated user purchase
        if (user) {
          // Check by user_id with retry logic
          const userResult = await executeAuthQuery(async () => {
            return await supabase
              .from('purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('quiz_id', quizId)
              .eq('status', 'completed')
              .single()
          })

          console.log('User purchase check:', { userPurchase: userResult.data, userError: userResult.error })

          if (userResult.data) {
            console.log('User has purchased this quiz via user_id')
            return true
          }

          // Check email-based purchases with retry logic
          const emailResult = await executeAuthQuery(async () => {
            return await supabase
              .from('purchases')
              .select('id')
              .eq('user_email', user.email)
              .eq('quiz_id', quizId)
              .eq('status', 'completed')
              .single()
          })

          console.log('Email purchase check:', { emailPurchase: emailResult.data, emailError: emailResult.error })

          if (emailResult.data) {
            console.log('User has email-based purchase for this quiz')
            return true
          }
        }

        // Check for session-based access (from payment success)
        const sessionId = searchParams.get('session_id')
        if (sessionId) {
          console.log('Checking session access for:', sessionId)
          
          try {
            const response = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })

            if (response.ok) {
              const data = await response.json()
              console.log('Session verification result:', data)
              if (data.quizId === quizId) {
                console.log('Session provides access to this quiz')
                return true
              }
            }
          } catch (error) {
            console.error('Error verifying payment session:', error)
          }
        }

        // Check for token-based access with retry logic
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
            console.log('Valid token provides access')
            return true
          }
        }

        console.log('No valid access found for quiz')
        return false
        
      } finally {
        // Clear the promise after a short delay to allow duplicate calls to resolve
        setTimeout(() => {
          checkingAccessPromise.current = null
        }, 100)
      }
    })()
    
    return await checkingAccessPromise.current
  }

 const startQuiz = async (quiz: Quiz) => {
   // Auto-generate student name from user info or use default
   const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
   setStudentName(displayName)

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
     // Quiz completed - save attempt and show results
     saveQuizAttempt()
     setQuizCompleted(true)
   }
 }

 // Save completed quiz attempt to database
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
 }

 // Helper function to get current fluency rate
 const getCurrentFluencyRate = () => {
   if (!startTime || score === 0) return 0
   const currentTime = new Date()
   const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60)
   return score / elapsedMinutes
 }

 // Show access error
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

 // Show loading while checking access
 if (checkingAccess || loading) {
   return (
     <div className="flex items-center justify-center min-h-screen">
       <div className="text-xl">
         {checkingAccess ? 'Checking quiz access...' : 'Loading quiz...'}
       </div>
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
     <div className="min-h-screen bg-gray-100 py-8">
       <div className="max-w-4xl mx-auto p-4 sm:p-6">
         <div className="bg-white rounded-lg shadow-lg text-center p-6 sm:p-8">
           <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Quiz Completed! 🎉</h2>
           
           {/* Results Summary */}
           <div className="grid md:grid-cols-3 gap-6 mb-8">
             {/* Accuracy Score */}
             <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
               <div className="text-4xl sm:text-6xl font-bold mb-2 text-blue-600">{percentage}%</div>
               <div className="text-sm sm:text-base text-gray-700">Accuracy</div>
               <div className="text-xs sm:text-sm text-gray-600 mt-1">
                 {score} out of {questions.length} correct
               </div>
             </div>
             
             {/* Fluency Score */}
             <div className={`rounded-lg p-4 sm:p-6 ${isAboveThreshold ? 'bg-green-50' : 'bg-red-50'}`}>
               <div className={`text-2xl sm:text-4xl font-bold mb-2 ${isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
                 {correctResponsesPerMinute.toFixed(1)}
               </div>
               <div className="text-sm sm:text-base text-gray-700">Correct/min</div>
               <div className="text-xs sm:text-sm text-gray-600 mt-1">
                 Target: {threshold}/min
               </div>
             </div>
             
             {/* Time Taken */}
             <div className="bg-purple-50 rounded-lg p-4 sm:p-6">
               <div className="text-2xl sm:text-4xl font-bold mb-2 text-purple-600">
                 {totalQuizTimeMinutes.toFixed(1)}
               </div>
               <div className="text-sm sm:text-base text-gray-700">Minutes</div>
               <div className="text-xs sm:text-sm text-gray-600 mt-1">
                 Total time
               </div>
             </div>
           </div>

           {/* Performance Analysis */}
           <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
             <h3 className="text-lg sm:text-xl font-semibold mb-3 text-gray-900">Performance Analysis</h3>
             
             {/* Rate Bar */}
             <div className="relative w-full h-6 sm:h-8 bg-gray-200 rounded-lg overflow-hidden mb-3">
               {/* Threshold line */}
               <div className="absolute left-0 top-0 w-px h-full bg-gray-400 z-10"></div>
               
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
               <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                 {isAboveThreshold 
                   ? `+${rateScore.toFixed(1)} above target!` 
                   : `${(threshold - correctResponsesPerMinute).toFixed(1)} below target`
                 }
               </div>
             </div>
             
             <div className="text-xs sm:text-sm text-gray-600">
               {isAboveThreshold 
                 ? "Excellent fluency! You're answering quickly and accurately." 
                 : "Focus on building speed while maintaining accuracy."
               }
             </div>
           </div>

           {/* Action Buttons */}
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
             <button
               onClick={() => router.push('/')}
               className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
             >
               Return Home
             </button>
             
             <button
               onClick={resetQuiz}
               className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
             >
               Take Another Quiz
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

 // If a specific quiz was selected from landing page, show start button
 if (selectedQuiz && !questions.length) {
   const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
   
   return (
     <div className="max-w-2xl mx-auto p-6">
       <div className="bg-white rounded-lg shadow-lg p-8">
         <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">{selectedQuiz.title}</h1>
         <p className="text-gray-600 text-center mb-8">{selectedQuiz.description}</p>
         
         {user && (
           <p className="text-center text-gray-700 mb-6">
             Ready to start, {displayName}?
           </p>
         )}

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
     <div className="min-h-screen bg-gray-100">
       {/* Header with Return Home button */}
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
         {/* Main content area */}
         <div className="w-full">
           {/* Progress bar */}
           <div className="mb-4 sm:mb-6">
             <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-600 mb-2 gap-1 sm:gap-4">
               <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
               <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                 <span className="text-sm">{score} correct so far</span>
                 {score > 0 && (
                   <span className={`font-bold text-base sm:text-lg ${
                     currentRate >= 30 ? 'text-green-600' : 'text-red-600'
                   }`}>
                     {currentRate.toFixed(1)} correct/min
                   </span>
                 )}
               </div>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2">
               <div 
                 className="bg-blue-600 h-2 sm:h-2 rounded-full transition-all duration-300"
                 style={{ width: `${progress}%` }}
               ></div>
             </div>
           </div>

           {/* Question */}
           <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
             <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 leading-relaxed text-gray-900">{currentQuestion.question_text}</h2>

             {/* Answer options */}
             <div className="space-y-3 mb-4 sm:mb-6">
               {currentQuestion.answer_options
                 .sort((a, b) => a.option_letter.localeCompare(b.option_letter))
                 .map((option) => (
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
                     value={option.option_letter}
                     checked={selectedAnswer === option.option_letter}
                     onChange={(e) => setSelectedAnswer(e.target.value)}
                     disabled={showFeedback}
                     className="mr-3 mt-0.5 flex-shrink-0"
                   />
                   <span className="text-sm sm:text-base text-gray-900 leading-relaxed">
                     <span className="font-medium">{option.option_letter}.</span> {option.option_text}
                   </span>
                 </label>
               ))}
             </div>

             {/* Feedback */}
             {showFeedback && (
               <div className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 ${
                 selectedAnswer === currentQuestion.correct_answer
                   ? 'bg-green-100 border border-green-300'
                   : 'bg-red-100 border border-red-300'
               }`}>
                 <div className="font-semibold mb-2 text-sm sm:text-base text-gray-900">
                   {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct!' : '❌ Incorrect'}
                 </div>
                 <div className="text-sm text-gray-800 mb-1">
                   <strong>Correct Answer:</strong> {currentQuestion.correct_answer}
                 </div>
                 <div className="text-sm text-gray-800 leading-relaxed">
                   <strong>Explanation:</strong> {currentQuestion.explanation}
                 </div>
               </div>
             )}

             {/* Action buttons */}
             <div className="flex justify-center sm:justify-end">
               {!showFeedback ? (
                 <button
                   onClick={submitAnswer}
                   disabled={!selectedAnswer}
                   className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                 >
                   Submit Answer
                 </button>
               ) : (
                 <button
                   onClick={nextQuestion}
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
         <p className="text-gray-600 text-center">No free quizzes available. Please return to the main page to purchase premium quizzes.</p>
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