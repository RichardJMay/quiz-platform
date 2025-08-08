// Testing feature branch deployment

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'

interface Quiz {
  id: string
  title: string
  description: string
  price: number
  is_free: boolean
}

export default function LandingPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, price, is_free')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes(data || [])
    }
    setLoading(false)
  }

  const startFreeQuiz = (quiz: Quiz) => {
    router.push(`/quiz?id=${quiz.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading available quizzes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Platform</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Available Quizzes</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Test your knowledge with interactive quizzes that provide immediate feedback 
            and track your fluency performance in real-time.
          </p>
        </div>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Quizzes Available Yet</h3>
            <p className="text-gray-600">Check back soon for new quizzes!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-8">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  {/* Price display for paid quizzes */}
                  {!quiz.is_free && (
                    <div className="mb-4">
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                        ${quiz.price}
                      </span>
                    </div>
                  )}
                  
                  {/* Conditional button rendering */}
                  {quiz.is_free ? (
                    <button
                      onClick={() => startFreeQuiz(quiz)}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Start Free Quiz
                    </button>
                  ) : (
                    <PaymentButton
                      quizId={quiz.id}
                      price={quiz.price}
                      title={quiz.title}
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}