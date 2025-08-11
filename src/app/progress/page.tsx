'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface QuizAttempt {
  id: string
  quiz_id: string
  student_name: string
  total_questions: number
  correct_answers: number
  accuracy_percentage: number
  fluency_rate: number
  total_time_minutes: number
  completed_at: string
  quizzes: {
    title: string
    description: string
  } | null
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [showGraph, setShowGraph] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadAttempts()
  }, [user])

  const loadAttempts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          student_name,
          total_questions,
          correct_answers,
          accuracy_percentage,
          fluency_rate,
          total_time_minutes,
          completed_at,
          quizzes!inner(title, description)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error loading attempts:', error)
      } else {
        // Handle the data structure properly
        const typedData = (data || []).map(item => ({
          ...item,
          quizzes: Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes
        })) as QuizAttempt[]
        setAttempts(typedData)
      }
    } catch (error) {
      console.error('Error in loadAttempts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUniqueQuizzes = () => {
    const quizMap = new Map()
    attempts.forEach(attempt => {
      if (attempt.quizzes && !quizMap.has(attempt.quiz_id)) {
        quizMap.set(attempt.quiz_id, attempt.quizzes.title)
      }
    })
    return Array.from(quizMap.entries())
  }

  const filteredAttempts = selectedQuiz === 'all' 
    ? attempts 
    : attempts.filter(attempt => attempt.quiz_id === selectedQuiz)

  const getPerformanceColor = (accuracy: number, fluency: number) => {
    if (accuracy >= 80 && fluency >= 30) return 'text-green-600 bg-green-50'
    if (accuracy >= 60 && fluency >= 20) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getOverallStats = () => {
    if (filteredAttempts.length === 0) return null
    
    const avgAccuracy = filteredAttempts.reduce((sum, a) => sum + a.accuracy_percentage, 0) / filteredAttempts.length
    const avgFluency = filteredAttempts.reduce((sum, a) => sum + a.fluency_rate, 0) / filteredAttempts.length
    const totalAttempts = filteredAttempts.length
    const bestAccuracy = Math.max(...filteredAttempts.map(a => a.accuracy_percentage))
    const bestFluency = Math.max(...filteredAttempts.map(a => a.fluency_rate))

    // Calculate improvement (comparing first vs last attempt)
    const firstAttempt = filteredAttempts[filteredAttempts.length - 1] // oldest
    const lastAttempt = filteredAttempts[0] // newest
    const accuracyImprovement = totalAttempts > 1 ? lastAttempt.accuracy_percentage - firstAttempt.accuracy_percentage : 0
    const fluencyImprovement = totalAttempts > 1 ? lastAttempt.fluency_rate - firstAttempt.fluency_rate : 0

    return { avgAccuracy, avgFluency, totalAttempts, bestAccuracy, bestFluency, accuracyImprovement, fluencyImprovement }
  }

  const getProgressChartData = () => {
    return filteredAttempts
      .slice()
      .reverse() // Show chronological order
      .map((attempt, index) => ({
        attempt: index + 1,
        fluency: attempt.fluency_rate,
        accuracy: attempt.accuracy_percentage,
        date: new Date(attempt.completed_at).toLocaleDateString()
      }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading your progress...</div>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Progress History</h1>
            <p className="text-gray-600">Track your quiz performance over time</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {attempts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Quiz Attempts Yet</h3>
            <p className="text-gray-600 mb-6">Complete some quizzes to see your progress here!</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Take Your First Quiz
            </button>
          </div>
        ) : (
          <>
            {/* Quiz Filter */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <label htmlFor="quiz-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Quiz:
              </label>
              <select
                id="quiz-filter"
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="w-full sm:w-auto px-3 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              >
                <option value="all">All Quizzes Combined</option>
                {getUniqueQuizzes().map(([quizId, title]) => (
                  <option key={quizId} value={quizId}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiz-Specific Stats */}
            {stats && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {selectedQuiz === 'all' ? 'All Quizzes Combined' : getUniqueQuizzes().find(([id]) => id === selectedQuiz)?.[1]} - Performance Summary
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalAttempts}</div>
                    <div className="text-sm text-gray-600">Attempts</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.avgAccuracy.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Avg Accuracy</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.avgFluency.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Avg Fluency</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.bestAccuracy}%</div>
                    <div className="text-sm text-gray-600">Best Accuracy</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.bestFluency.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Best Fluency</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className={`text-2xl font-bold ${stats.accuracyImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.accuracyImprovement > 0 ? '+' : ''}{stats.accuracyImprovement.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Accuracy Trend</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className={`text-2xl font-bold ${stats.fluencyImprovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.fluencyImprovement > 0 ? '+' : ''}{stats.fluencyImprovement.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Fluency Trend</div>
                  </div>
                </div>

                {/* Progress Graph */}
                {filteredAttempts.length > 1 && selectedQuiz !== 'all' && (
                  <div className="mb-8 bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Progress Over Time</h3>
                      <button
                        onClick={() => setShowGraph(!showGraph)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {showGraph ? 'Hide Graph' : 'Show Graph'}
                      </button>
                    </div>
                    
                    {showGraph && (
                      <div className="mt-4">
                        <svg width="100%" height="400" viewBox="0 0 900 400" className="bg-white">
                          {(() => {
                            const chartData = getProgressChartData()
                            const maxFluency = Math.max(...chartData.map(d => d.fluency), 60)
                            const minFluency = Math.min(...chartData.map(d => d.fluency), 0)
                            const fluencyRange = maxFluency - minFluency
                            const chartHeight = 280
                            const chartWidth = 700
                            const startX = 100
                            const startY = 50
                            
                            const xStep = chartWidth / Math.max(chartData.length - 1, 1)
                            const yScale = chartHeight / fluencyRange
                            
                            return (
                              <g>
                                {/* Chart background */}
                                <rect 
                                  x={startX} 
                                  y={startY} 
                                  width={chartWidth} 
                                  height={chartHeight} 
                                  fill="white" 
                                  stroke="#000000" 
                                  strokeWidth="2"
                                />
                                
                                {/* Y-axis grid lines and labels */}
                                {[0, 10, 20, 30, 40, 50, 60].map(rate => {
                                  if (rate <= maxFluency && rate >= minFluency) {
                                    const y = startY + chartHeight - ((rate - minFluency) * yScale)
                                    return (
                                      <g key={rate}>
                                        <line 
                                          x1={startX} 
                                          y1={y} 
                                          x2={startX + chartWidth} 
                                          y2={y} 
                                          stroke="#e0e0e0" 
                                          strokeWidth="1"
                                        />
                                        <text 
                                          x={startX - 10} 
                                          y={y + 4} 
                                          textAnchor="end" 
                                          fontSize="12" 
                                          fill="#333333"
                                          fontFamily="Arial, sans-serif"
                                        >
                                          {rate}
                                        </text>
                                      </g>
                                    )
                                  }
                                  return null
                                })}
                                
                                {/* X-axis grid lines and labels */}
                                {chartData.map((d, i) => {
                                  const x = startX + (i * xStep)
                                  return (
                                    <g key={i}>
                                      <line 
                                        x1={x} 
                                        y1={startY} 
                                        x2={x} 
                                        y2={startY + chartHeight} 
                                        stroke="#e0e0e0" 
                                        strokeWidth="1"
                                      />
                                      <text 
                                        x={x} 
                                        y={startY + chartHeight + 20} 
                                        textAnchor="middle" 
                                        fontSize="12" 
                                        fill="#333333"
                                        fontFamily="Arial, sans-serif"
                                      >
                                        {i + 1}
                                      </text>
                                    </g>
                                  )
                                })}
                                
                                {/* Target line at 30 fluency (if within range) */}
                                {30 >= minFluency && 30 <= maxFluency && (
                                  <g>
                                    <line 
                                      x1={startX} 
                                      y1={startY + chartHeight - ((30 - minFluency) * yScale)} 
                                      x2={startX + chartWidth} 
                                      y2={startY + chartHeight - ((30 - minFluency) * yScale)} 
                                      stroke="#000000" 
                                      strokeWidth="2" 
                                      strokeDasharray="8,4"
                                    />
                                    <text 
                                      x={startX + chartWidth + 10} 
                                      y={startY + chartHeight - ((30 - minFluency) * yScale) + 4} 
                                      fontSize="12" 
                                      fill="#000000"
                                      fontFamily="Arial, sans-serif"
                                      fontWeight="bold"
                                    >
                                      Target (30)
                                    </text>
                                  </g>
                                )}
                                
                                {/* Fluency line */}
                                <polyline
                                  fill="none"
                                  stroke="#000000"
                                  strokeWidth="3"
                                  points={chartData.map((d, i) => 
                                    `${startX + (i * xStep)},${startY + chartHeight - ((d.fluency - minFluency) * yScale)}`
                                  ).join(' ')}
                                />
                                
                                {/* Data points */}
                                {chartData.map((d, i) => (
                                  <g key={i}>
                                    <circle 
                                      cx={startX + (i * xStep)} 
                                      cy={startY + chartHeight - ((d.fluency - minFluency) * yScale)} 
                                      r="5" 
                                      fill="#000000"
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                    />
                                    {/* Data labels on hover */}
                                    <text 
                                      x={startX + (i * xStep)} 
                                      y={startY + chartHeight - ((d.fluency - minFluency) * yScale) - 15} 
                                      textAnchor="middle" 
                                      fontSize="10" 
                                      fill="#333333"
                                      fontFamily="Arial, sans-serif"
                                      className="opacity-0 hover:opacity-100 transition-opacity"
                                    >
                                      {d.fluency.toFixed(1)}
                                    </text>
                                  </g>
                                ))}
                                
                                {/* Axis labels */}
                                <text 
                                  x={startX + chartWidth / 2} 
                                  y={startY + chartHeight + 50} 
                                  textAnchor="middle" 
                                  fontSize="14" 
                                  fill="#000000"
                                  fontFamily="Arial, sans-serif"
                                  fontWeight="bold"
                                >
                                  Session Number
                                </text>
                                
                                <text 
                                  x={30} 
                                  y={startY + chartHeight / 2} 
                                  textAnchor="middle" 
                                  fontSize="14" 
                                  fill="#000000"
                                  fontFamily="Arial, sans-serif"
                                  fontWeight="bold"
                                  transform={`rotate(-90, 30, ${startY + chartHeight / 2})`}
                                >
                                  Fluency Rate (correct/min)
                                </text>
                                
                                {/* Chart title */}
                                <text 
                                  x={startX + chartWidth / 2} 
                                  y={30} 
                                  textAnchor="middle" 
                                  fontSize="16" 
                                  fill="#000000"
                                  fontFamily="Arial, sans-serif"
                                  fontWeight="bold"
                                >
                                  Fluency Progress Over Time
                                </text>
                                
                                {/* Major axis lines */}
                                <line 
                                  x1={startX} 
                                  y1={startY} 
                                  x2={startX} 
                                  y2={startY + chartHeight} 
                                  stroke="#000000" 
                                  strokeWidth="3"
                                />
                                <line 
                                  x1={startX} 
                                  y1={startY + chartHeight} 
                                  x2={startX + chartWidth} 
                                  y2={startY + chartHeight} 
                                  stroke="#000000" 
                                  strokeWidth="3"
                                />
                              </g>
                            )
                          })()}
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Attempts List */}
            <div className="space-y-4">
              {filteredAttempts.map((attempt) => (
                <div key={attempt.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {attempt.quizzes?.title || 'Unknown Quiz'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.completed_at).toLocaleDateString()} at{' '}
                        {new Date(attempt.completed_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getPerformanceColor(attempt.accuracy_percentage, attempt.fluency_rate)
                    }`}>
                      {attempt.fluency_rate >= 30 ? 'Excellent' : attempt.fluency_rate >= 20 ? 'Good' : 'Needs Practice'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{attempt.accuracy_percentage}%</div>
                      <div className="text-xs text-gray-600">Accuracy</div>
                      <div className="text-xs text-gray-500">
                        {attempt.correct_answers}/{attempt.total_questions}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{attempt.fluency_rate.toFixed(1)}</div>
                      <div className="text-xs text-gray-600">Fluency Rate</div>
                      <div className="text-xs text-gray-500">correct/min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{attempt.total_time_minutes.toFixed(1)}</div>
                      <div className="text-xs text-gray-600">Time Taken</div>
                      <div className="text-xs text-gray-500">minutes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{attempt.total_questions}</div>
                      <div className="text-xs text-gray-600">Questions</div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}