import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseDefinitionQuestions } from '../src/lib/definition-variants.ts'
import { termCertification } from '../src/lib/adaptive-accuracy.ts'

const canonical = { id: 'question', correct_term_id: 'term', question_text: 'Original wording', rephrased_definition: 'Rephrased wording' }
test('either wording keeps the same question and term identity, without changing the source', () => {
  const rephrased = chooseDefinitionQuestions([canonical], () => 0)[0]
  const original = chooseDefinitionQuestions([canonical], () => 0.9)[0]
  assert.equal(rephrased.question_text, 'Rephrased wording')
  assert.equal(original.question_text, 'Original wording')
  assert.equal(rephrased.id, original.id)
  assert.equal(rephrased.correct_term_id, original.correct_term_id)
  assert.equal(canonical.question_text, 'Original wording')
})
test('a set never duplicates terms, and a missing alternative remains usable', () => {
  const rows = chooseDefinitionQuestions([canonical, canonical, { id: 'q2', correct_term_id: 't2', question_text: 'One wording' }], () => 0)
  assert.equal(rows.length, 2)
  assert.equal(rows[1].question_text, 'One wording')
})
test('different wordings contribute to the existing two-session independence rule', () => {
  const response = (sessionId, definitionVariant, supportLevel = 0) => ({
    sessionId, definitionVariant, sessionCompleted: true, isStandardFormat: true,
    supportLevel, response: 'correct',
  })
  assert.equal(termCertification([response('one', 0), response('two', 1)]).certified, true)
  assert.equal(termCertification([response('one', 0), response('one', 1)]).certified, false)
  assert.equal(termCertification([response('one', 0), response('two', 1, 1)]).certified, false)
})
