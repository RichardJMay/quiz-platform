'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ExcelUpload from '@/components/ExcelUpload'

export default function AdminPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('quizzes').select('*').limit(1)
        console.log('Connection test:', { data, error })
        setConnected(true)
      } catch (err) {
        console.error('Connection failed:', err)
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Testing database connection...</div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Quiz Platform Admin</h1>
          <div className="text-red-600 text-xl">
            ❌ Database connection failed
          </div>
          <p className="mt-4 text-gray-600">
            Please check your Supabase configuration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Quiz Platform Admin</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="text-green-600 text-lg mb-2">
              ✅ Database connected successfully
            </div>
            <p className="text-gray-600 mb-4">
              Upload your Excel file with quiz questions and set pricing.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View Public Site
              </Link>
              <Link
                href="/quiz"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Test Quiz Interface
              </Link>
            </div>
          </div>

          <ExcelUpload />
        </div>
      </div>
    </div>
  )
}