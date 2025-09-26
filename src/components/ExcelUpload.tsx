'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

type QuizData = {
  question: string
  optionA?: string
  optionB?: string
  optionC?: string
  optionD?: string
  correctAnswer: string
  explanation?: string
  hint?: string | null
}

export default function ExcelUpload() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [quizTitle, setQuizTitle] = useState('')

  // --- Helpers ---
  const clean = (v: unknown) => String(v ?? '').trim()
  const upper = (v: unknown) => clean(v).toUpperCase()
  const getFirst = (row: Record<string, unknown>, keys: string[]) =>
    keys.reduce<string>((acc, k) => (acc !== '' ? acc : clean((row as any)[k])), '')

  const processExcelFile = async (file: File) => {
    return new Promise<QuizData[]>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

          const rows: QuizData[] = jsonRows.map((row) => {
            const question = getFirst(row, ['Question', 'question', 'Item', 'item'])
            const optionA = getFirst(row, ['Option A', 'optionA', 'A'])
            const optionB = getFirst(row, ['Option B', 'optionB', 'B'])
            const optionC = getFirst(row, ['Option C', 'optionC', 'C'])
            const optionD = getFirst(row, ['Option D', 'optionD', 'D'])
            const correctAnswer = getFirst(row, ['Correct Answer', 'correctAnswer', 'Answer', 'answer'])
            const explanation = getFirst(row, ['Explanation', 'explanation'])
            const hintRaw = getFirst(row, ['Hint', 'hint'])

            return {
              question,
              optionA,
              optionB,
              optionC,
              optionD,
              correctAnswer,
              explanation,
              hint: hintRaw || null,
            }
          })

          resolve(rows)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('File reading failed'))
      reader.readAsArrayBuffer(file)
    })
  }

  const uploadQuizData = async (quizData: QuizData[]) => {
    // Create the quiz shell
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{ title: quizTitle, description: `Quiz with ${quizData.length} questions` }])
      .select()
      .single()

    if (quizError) throw quizError

    // Insert each question + its non-empty options
    for (let idx = 0; idx < quizData.length; idx++) {
      const rowNum = idx + 2 // Excel-ish: header is row 1
      const q = quizData[idx]

      const question_text = clean(q.question)
      const correct = upper(q.correctAnswer)
      const explanation = clean(q.explanation)
      const hint = q.hint ? clean(q.hint) : null

      if (!question_text) {
        throw new Error(`Row ${rowNum}: "Question" is required.`)
      }
      if (!['A', 'B', 'C', 'D'].includes(correct)) {
        throw new Error(`Row ${rowNum}: "Correct Answer" must be one of A, B, C, or D (got "${q.correctAnswer}").`)
      }

      const optionsAll = [
        { option_letter: 'A' as const, option_text: clean(q.optionA) },
        { option_letter: 'B' as const, option_text: clean(q.optionB) },
        { option_letter: 'C' as const, option_text: clean(q.optionC) },
        { option_letter: 'D' as const, option_text: clean(q.optionD) },
      ]

      // Keep only non-empty options (supports 2–4 options)
      const options = optionsAll.filter((o) => o.option_text.length > 0)

      if (options.length < 2) {
        throw new Error(`Row ${rowNum}: At least two non-empty options are required (A and B).`)
      }
      if (!options.some((o) => o.option_letter === correct)) {
        throw new Error(`Row ${rowNum}: Correct Answer "${correct}" has no text. Provide Option ${correct}.`)
      }

      // Insert the question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([
          {
            quiz_id: quiz.id,
            question_text,
            correct_answer: correct, // canonical letter
            explanation,
            hint, // nullable; UI will show a "Hint" button only if present
          },
        ])
        .select()
        .single()

      if (questionError) throw questionError

      // Insert only the present options
      const { error: optionsError } = await supabase
        .from('answer_options')
        .insert(
          options.map((o) => ({
            question_id: question.id,
            option_letter: o.option_letter,
            option_text: o.option_text,
          }))
        )

      if (optionsError) throw optionsError
    }

    return quiz
  }

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!quizTitle.trim()) {
      setMessage('Please enter a quiz title first.')
      return
    }

    setLoading(true)
    setMessage('Processing file...')

    try {
      const quizData = await processExcelFile(file)
      if (quizData.length === 0) {
        throw new Error('No rows found in the first worksheet.')
      }

      setMessage(`Found ${quizData.length} rows. Uploading to database...`)
      const quiz = await uploadQuizData(quizData)

      setMessage(`✅ Successfully uploaded "${quiz.title}" with ${quizData.length} questions!`)
      setQuizTitle('')
      event.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Upload failed'
      setMessage(`❌ Error: ${msg}`)
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
        <div
          className={`p-3 rounded ${
            message.includes('✅')
              ? 'bg-green-100 text-green-700'
              : message.includes('❌')
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Excel format expected:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>
            Column headers (case-insensitive accepted): <em>Question</em>, <em>Option A</em>, <em>Option B</em>,
            <em> Option C</em> (optional), <em>Option D</em> (optional), <em>Correct Answer</em>, <em>Explanation</em>, <em>Hint</em> (optional)
          </li>
          <li>
            You may leave <em>Option C</em> and/or <em>Option D</em> blank. The uploader will skip empty options.
          </li>
          <li>
            <strong>Correct Answer</strong> must be one of A, B, C, or D, and that option must have text.
          </li>
          <li>
            Explanations should be letter-free (e.g., no “B is correct” inside the explanation text).
          </li>
          <li>
            If you supply a <em>Hint</em>, learners will see a “Show Hint” button on that item.
          </li>
        </ul>
      </div>
    </div>
  )
}

