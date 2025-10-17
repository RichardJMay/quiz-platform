'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

type Row = {
  term: string
  definition: string
  explanation?: string
  hint?: string | null
}

type ResponseMode = 'options' | 'typed'

export default function BankedUpload() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [responseMode, setResponseMode] = useState<ResponseMode>('options')

  // --- helpers ---
  const clean = (v: unknown) => String(v ?? '').trim()
  const lower = (v: unknown) => clean(v).toLowerCase()
  const getFirst = (row: Record<string, unknown>, keys: string[]) =>
    keys.reduce<string>((acc, k) => (acc !== '' ? acc : clean((row as any)[k])), '')

  const processExcelFile = async (file: File) => {
    return new Promise<Row[]>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

          const rows: Row[] = jsonRows.map((r, idx) => {
            const term = getFirst(r, ['Term', 'term'])
            const definition = getFirst(r, ['Definition', 'definition', 'Prompt', 'prompt'])
            const explanation = getFirst(r, ['Explanation', 'explanation'])
            const hintRaw = getFirst(r, ['Hint', 'hint'])
            return {
              term,
              definition,
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

  const uploadBankedQuiz = async (rows: Row[]) => {
    // 1) Basic validation
    if (!quizTitle.trim()) {
      throw new Error('Please enter a quiz title first.')
    }
    const filtered = rows
      .map((r, i) => ({
        ...r,
        term: clean(r.term),
        definition: clean(r.definition),
        explanation: clean(r.explanation),
        hint: r.hint ? clean(r.hint) : null,
        _row: i + 2, // excel-ish row number
      }))
      .filter(r => r.term.length > 0 || r.definition.length > 0)

    if (filtered.length === 0) throw new Error('No usable rows found in the first worksheet.')

    // validate each row
    for (const r of filtered) {
      if (!r.term) throw new Error(`Row ${r._row}: "Term" is required.`)
      if (!r.definition) throw new Error(`Row ${r._row}: "Definition" is required.`)
    }

    // 2) Create the quiz shell (banked + response_mode)
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{
        title: quizTitle.trim(),
        description: `Definition–Term quiz with ${filtered.length} items`,
        quiz_mode: 'banked',
        response_mode: responseMode,    // <-- key: 'options' or 'typed'
        is_free: true,                  // per your free-only pilot
        is_listed: true,                // visible in listings by default
      }])
      .select('id, title')
      .single()

    if (quizError || !quiz) throw quizError || new Error('Failed to create quiz.')

    // 3) Upsert unique terms for this quiz
    // Build unique term list (case-insensitive uniqueness)
    const seen = new Set<string>()
    const uniqueTerms = []
    for (const r of filtered) {
      const key = lower(r.term)
      if (!seen.has(key)) {
        seen.add(key)
        uniqueTerms.push({ quiz_id: quiz.id, term_text: r.term })
      }
    }

    // Insert terms
    const { data: insertedTerms, error: termsError } = await supabase
      .from('quiz_term_bank')
      .insert(uniqueTerms)
      .select('id, term_text')

    if (termsError) throw termsError

    // 4) Build map: term_text (lower) -> id
    const termIdByLowerText = new Map(
      (insertedTerms || []).map(t => [t.term_text.toLowerCase(), t.id as string])
    )

    // 5) Prepare questions: each definition points to correct_term_id
    const questionsPayload = filtered.map(r => {
      const correctId = termIdByLowerText.get(r.term.toLowerCase())
      if (!correctId) {
        throw new Error(`Internal mapping error: could not find term id for "${r.term}"`)
      }
      return {
        quiz_id: quiz.id,
        question_text: r.definition,
        explanation: r.explanation,
        hint: r.hint,
        correct_term_id: correctId,
      }
    })

    const { error: qErr } = await supabase
      .from('questions')
      .insert(questionsPayload)

    if (qErr) throw qErr

    return quiz
  }

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('Processing file...')

    try {
      const rows = await processExcelFile(file)
      if (rows.length === 0) {
        throw new Error('No rows found in the first worksheet.')
      }

      setMessage(`Found ${rows.length} rows. Uploading to database...`)
      const quiz = await uploadBankedQuiz(rows)

      // Reset UI
      setMessage(
        `✅ Uploaded "${quiz.title}".\n\n` +
        `Test links:\n` +
        `• Options: /quiz?id=${quiz.id}\n` +
        `• Typed:   /quiz?id=${quiz.id}&typed=1`
      )
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
      <h2 className="text-2xl font-bold mb-4">Upload Definition–Term Quiz</h2>

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
        <label className="block text-sm font-medium mb-2">Response mode</label>
        <select
          value={responseMode}
          onChange={(e) => setResponseMode(e.target.value as ResponseMode)}
          disabled={loading}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="options">Options (show bank of terms)</option>
          <option value="typed">Typed (no options; student types term)</option>
        </select>
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
        <pre
          className={`whitespace-pre-wrap p-3 rounded text-sm ${
            message.startsWith('✅')
              ? 'bg-green-100 text-green-700'
              : message.startsWith('❌')
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {message}
        </pre>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Excel format expected:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>
            Column headers (case-insensitive): <em>Term</em>, <em>Definition</em>, <em>Explanation</em>, <em>Hint</em> (optional)
          </li>
          <li>
            Each row becomes one question. The <em>Definition</em> is shown; the correct <em>Term</em> is the answer.
          </li>
          <li>
            <strong>Response mode</strong> controls how students answer:
            <ul className="list-disc list-inside ml-5">
              <li><em>Options</em>: choose from a shared bank of terms; correct ones disappear as you go.</li>
              <li><em>Typed</em>: no options; students must type the term.</li>
            </ul>
          </li>
          <li>
            Explanations should be letter-free (no “B is correct”).
          </li>
        </ul>
      </div>
    </div>
  )
}
