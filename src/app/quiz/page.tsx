'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import QuizTaker from '@/components/QuizTaker'
import QuizTakerBanked from '@/components/QuizTakerBanked'
import QuizTakerBankedTyped from '@/components/QuizTakerBankedTyped'
import { supabase } from '@/lib/supabase'

type QuizMode = 'mcq' | 'banked'
type ResponseMode = 'options' | 'typed' | null

function QuizLoader() {
  const searchParams = useSearchParams()
  const quizId = searchParams.get('id')

  const [mode, setMode] = useState<QuizMode | null>(null)
  const [responseMode, setResponseMode] = useState<ResponseMode>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMode = async () => {
      if (!quizId) {
        setMode(null)
        setResponseMode(null)
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('quiz_mode, response_mode')
          .eq('id', quizId)
          .single()

        if (error || !data) {
          console.error('Failed to load quiz mode', error)
          setMode('mcq') // safe fallback
          setResponseMode('options')
        } else {
          setMode((data.quiz_mode as QuizMode) || 'mcq')
          // default banked response mode to 'options' if null
          setResponseMode((data.response_mode as ResponseMode) ?? 'options')
        }
      } catch (err) {
        console.error(err)
        setMode('mcq')
        setResponseMode('options')
      } finally {
        setLoading(false)
      }
    }

    fetchMode()
  }, [quizId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading quiz...</div>
      </div>
    )
  }

  if (!mode) {
    // No id → fall back to the MCQ component's selection screen
    return <QuizTaker />
  }

  if (mode === 'banked') {
    return responseMode === 'typed' ? <QuizTakerBankedTyped /> : <QuizTakerBanked />
  }

  return <QuizTaker />
}

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-xl">Loading quiz...</div>
            </div>
          }
        >
          <QuizLoader />
        </Suspense>
      </div>
    </div>
  )
}

