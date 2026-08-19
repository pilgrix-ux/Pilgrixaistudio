import test from 'node:test'
import assert from 'node:assert/strict'
import { createFeedbackEvent, summarizeFeedback, deriveQualitySignals } from './feedback-intelligence.mjs'

test('feedback events are validated and privacy metadata is allowlisted', () => {
  const event = createFeedbackEvent({ userId: 'u1', jobId: 'j1', type: 'negative', reason: 'bad_timing', note: 'too late', metadata: { feature: 'reference', secret: 'remove-me' } })
  assert.equal(event.metadata.feature, 'reference')
  assert.equal(event.metadata.secret, undefined)
})

test('feedback summary identifies acceptance and top problems', () => {
  const events = [
    createFeedbackEvent({ userId: 'u', jobId: '1', type: 'positive' }),
    createFeedbackEvent({ userId: 'u', jobId: '2', type: 'negative', reason: 'bad_timing' }),
    createFeedbackEvent({ userId: 'u', jobId: '3', type: 'negative', reason: 'bad_timing' }),
  ]
  const summary = summarizeFeedback(events)
  assert.equal(summary.acceptanceRate, 1 / 3)
  assert.deepEqual(summary.topProblems[0], { reason: 'bad_timing', count: 2 })
})

test('quality signals expose repeated regeneration and capability gaps', () => {
  const result = deriveQualitySignals({ regenerateCount: 2, accepted: false, capability: [{ status: 'missing' }] })
  assert.ok(result.signals.includes('repeated_regeneration'))
  assert.ok(result.signals.includes('source_capability_gap'))
})
