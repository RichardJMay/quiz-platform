import { Suspense } from 'react'
import QuizTaker from '@/components/QuizTaker'

function QuizTakerWrapper() {
  return <QuizTaker />
}

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-xl">Loading quiz...</div>
          </div>
        }>
          <QuizTakerWrapper />
        </Suspense>
      </div>
    </div>
  )
}