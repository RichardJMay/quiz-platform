import test from 'node:test'
import assert from 'node:assert/strict'
import {
  baselineTermOrder, initialKnowledge, selectTeachingTerms,
  termCertification, updateKnowledge,
} from '../src/lib/adaptive-accuracy.ts'

test('baseline includes each term once and changes its order', () => {
  const ids = ['a', 'b', 'c', 'd']
  assert.deepEqual(baselineTermOrder(ids, () => 0), ['b', 'c', 'd', 'a'])
  assert.deepEqual(ids, ['a', 'b', 'c', 'd'])
})

test('weaker evidence from three options and study transition', () => {
  const prior = initialKnowledge(3)
  assert.equal(prior, 0.3)
  assert.ok(updateKnowledge(prior, 'correct', 10) > updateKnowledge(prior, 'correct', 3))
  assert.ok(updateKnowledge(prior, 'dont_know', 10) < prior)
  assert.equal(updateKnowledge(prior, 'study', 0), prior + (1 - prior) * 0.15)
})

test('two completed sessions count; help, retries and unfinished sessions do not', () => {
  const independent = (sessionId, response, extra = {}) => ({
    sessionId, sessionCompleted: true, isStandardFormat: true,
    supportLevel: 0, response, ...extra,
  })
  const first = independent('baseline', 'correct')
  assert.equal(termCertification([first]).certified, false)
  assert.equal(termCertification([first, independent('baseline', 'correct')]).independentSessions, 1)
  assert.equal(termCertification([first, independent('second', 'correct', { sessionCompleted: false })]).certified, false)
  assert.equal(termCertification([first, independent('second', 'correct', { supportLevel: 1 })]).certified, false)
  assert.equal(termCertification([first, independent('second', 'correct')]).certified, true)
  assert.equal(termCertification([first, independent('second', 'correct'), independent('third', 'incorrect')]).certified, false)
  assert.equal(termCertification([first, independent('second', 'correct'), independent('third', 'incorrect'), independent('fourth', 'correct')]).certified, true)
})

test('teaching gives difficult terms priority while keeping some review terms', () => {
  const terms = Array.from({ length: 12 }, (_, n) => ({
    id: String(n), pKnown: n < 9 ? n / 20 : 0.99,
    certified: n >= 9, lastSeenAt: n, erroredLastSession: false,
    hasConfusion: false,
  }))
  const result = selectTeachingTerms(terms, { sessionLength: 10, targetFraction: 0.7 })
  assert.equal(result.length, 10)
  assert.deepEqual(result.slice(0, 7), ['0', '1', '2', '3', '4', '5', '6'])
  assert.deepEqual(result.slice(7), ['9', '10', '11'])
})
