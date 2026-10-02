import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptiveAccuracyAttempts, cumulativeWithAdaptive, termEvidence } from '../src/app/progress/adaptive-progress.ts'

const sessions = [
  { id: 'baseline', quiz_id: 'pack', kind: 'baseline', status: 'completed', completed_at: '2026-09-28T10:00:00Z', quizzes: null },
  { id: 'teaching', quiz_id: 'pack', kind: 'teaching', status: 'completed', completed_at: '2026-09-29T10:00:00Z', quizzes: null },
  { id: 'open', quiz_id: 'pack', kind: 'teaching', status: 'in_progress', completed_at: null, quizzes: null },
]
const response = (session_id, trial_type, is_correct, support_level = 0) => ({
  session_id, term_id: 'term', trial_type, is_correct, support_level,
  is_standard_format: support_level === 0,
  answered_at: session_id === 'baseline' ? '2026-09-28T09:00:00Z' : '2026-09-29T09:00:00Z',
})

test('adaptive graph uses completed scored sets and marks help', () => {
  const points = adaptiveAccuracyAttempts(sessions, [
    response('baseline', 'baseline', true),
    response('teaching', 'study', null),
    response('teaching', 'teach', false, 2),
    response('open', 'check', true),
  ])
  assert.equal(points.length, 2)
  assert.deepEqual(points.map(row => row.accuracy_percentage), [100, 0])
  assert.deepEqual(points.map(row => row.hint_used_any), [false, true])
  assert.equal(points[1].total_questions, 1)
})

test('term evidence requires completed independent checks in distinct sessions', () => {
  const evidence = termEvidence([
    response('baseline', 'baseline', true), response('baseline', 'check', true),
    response('teaching', 'teach', true, 1), response('open', 'check', true),
    response('teaching', 'check', false),
  ], new Set(['baseline', 'teaching']))
  assert.equal(evidence.get('term').sessions.size, 1)
  assert.equal(evidence.get('term').latestCorrect, false)
})

test('cumulative sets increase and only pack unlock counts adaptive mastery', () => {
  const points = cumulativeWithAdaptive([], sessions, [
    { quiz_id: 'pack', fluency_unlocked_at: '2026-09-29T11:00:00Z' },
  ], new Set())
  assert.deepEqual(points.map(row => [row.completed, row.accuracyMastered]), [[1, 0], [2, 1]])
  assert.deepEqual(cumulativeWithAdaptive([], sessions, [], new Set()).map(row => row.accuracyMastered), [0, 0])
})
