'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface QuizData {
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation: string
  hint?: string | null
}

export default function ExcelUpload() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [quizTitle, setQuizTitle] = useState('')

  const processExcelFile = async (file: File) => {
    return new Promise<QuizData[]>((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

          console.log('Raw Excel data:', jsonData)

          const quizData: QuizData[] = jsonData.map((row) => ({
            question: (row.Question || row.question || '') as string,
            optionA: (row['Option A'] || row.optionA || row.A || '') as string,
            optionB: (row['Option B'] || row.optionB || row.B || '') as string,
            optionC: (row['Option C'] || row.optionC || row.C || '') as string,
            optionD: (row['Option D'] || row.optionD || row.D || '') as string,
            correctAnswer: (row['Correct Answer'] || row.correctAnswer || row.Answer || '') as string,
            explanation: (row.Explanation || row.explanation || '') as string,
            // NEW: pick up Hint if present; normalize empty to null
            hint: (() => {
              const h = (row.Hint ?? row.hint ?? '') as string
              const trimmed = (h || '').toString().trim()
              return trimmed.length ? trimmed : null
            })(),
          }))

          resolve(quizData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('File reading failed'))
      reader.readAsArrayBuffer(file)
    })
  }

  const uploadQuizData = async (quizData: QuizData[]) => {
    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{ title: quizTitle, description: `Quiz with ${quizData.length} questions` }])
      .select()
      .single()

    if (quizError) throw quizError

    // Process each question
    for (const [idx, questionData] of quizData.entries()) {
      const correct = String(questionData.correctAnswer || '').trim().toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(correct)) {
        throw new Error(`Row ${idx + 2}: Correct Answer must be A, B, C, or D (got "${questionData.correctAnswer}")`)
      }

      // Insert question (includes hint)
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([{
          quiz_id: quiz.id,
          question_text: (questionData.question || '').toString().trim(),
          correct_answer: correct,
          explanation: (questionData.explanation || '').toString().trim(),
          hint: questionData.hint ?? null, // <-- NEW
        }])
        .select()
        .single()

      if (questionError) throw questionError

      // Insert answer options
      const options = [
        { option_letter: 'A', option_text: questionData.optionA },
        { option_letter: 'B', option_text: questionData.optionB },
        { option_letter: 'C', option_text: questionData.optionC },
        { option_letter: 'D', option_text: questionData.optionD }
      ].map(o => ({ ...o, option_text: (o.option_text || '').toString().trim() }))

      const { error: optionsError } = await supabase
        .from('answer_options')
        .insert(
          options.map(option => ({
            question_id: question.id,
            option_letter: option.option_letter,
            option_text: option.option_text
          }))
        )

      if (optionsError) throw optionsError
    }

    return quiz
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!quizTitle.trim()) {
      setMessage('Please enter a quiz title first')
      return
    }

    setLoading(true)
    setMessage('Processing file...')

    try {
      console.log('Starting file processing...')
      const quizData = await processExcelFile(file)
      console.log('Processed quiz data:', quizData)
      
      setMessage(`Found ${quizData.length} questions. Uploading to database...`)
      console.log('Starting database upload...')
      
      const quiz = await uploadQuizData(quizData)
      console.log('Upload completed:', quiz)
      
      setMessage(`✅ Successfully uploaded "${quiz.title}" with ${quizData.length} questions!`)
      setQuizTitle('')
      
      // Clear the file input
      event.target.value = ''
      
    } catch (error) {
      console.error('Upload error details:', error)
      setMessage(`❌ Error: ${error instanceof Error ? error.message : JSON.stringify(error) || 'Upload failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Upload Quiz Data</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Quiz Title:</label>
        <input
          type="text"
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter quiz title..."
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Excel File:</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={loading}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="flex items-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          <span>Processing...</span>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded ${
          message.includes('✅') ? 'bg-green-100 text-green-700' : 
          message.includes('❌') ? 'bg-red-100 text-red-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Excel format expected:</strong></p>
        <ul className="list-disc list-inside mt-1">
          <li>Column headers: <code>Question</code>, <code>Option A</code>, <code>Option B</code>, <code>Option C</code>, <code>Option D</code>, <code>Correct Answer</code>, <code>Explanation</code>, <code>Hint</code> (optional)</li>
          <li><code>Correct Answer</code> should be A, B, C, or D</li>
          <li><code>Hint</code> can be blank; when blank the hint button is hidden</li>
        </ul>
      </div>
    </div>
  )
}
