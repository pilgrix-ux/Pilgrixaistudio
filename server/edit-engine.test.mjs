import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEditPlan, compareReferenceToSource, createAnalysis, createEditJob, transitionJob } from './edit-engine.mjs'

test('creates a queued persistent edit job', () => {
  const job = createEditJob({ userId: 'u1', instruction: 'Make a cinematic short', sourceMedia: ['video-1'] })
  assert.equal(job.state, 'queued')
  assert.equal(job.progress, 0)
  assert.ok(job.id)
})

test('keeps analysis timestamps at millisecond precision', () => {
  const analysis = createAnalysis({ durationMs: 120034, shots: [{ id: 's1', startMs: 2137, endMs: 3684 }] })
  assert.equal(analysis.precision, 'millisecond')
  assert.equal(analysis.shots[0].startMs, 2137)
  assert.equal(analysis.shots[0].endMs, 3684)
})

test('matches reference segments semantically instead of assuming equal timelines', () => {
  const source = createAnalysis({ durationMs: 30000, shots: [{ id: 'source-17', startMs: 17921, endMs: 19106, action: 'walk', composition: 'medium', cameraMotion: 'push-in', subject: 'player', shotType: 'medium' }] })
  const report = compareReferenceToSource({ referenceSegments: [{ id: 'ref-2', startMs: 2137, endMs: 3684, action: 'walk', composition: 'medium', cameraMotion: 'push-in', subject: 'player', shotType: 'medium' }], sourceAnalysis: source })
  assert.equal(report[0].status, 'available')
  assert.equal(report[0].sourceShotId, 'source-17')
})

test('does not invent unsupported reference footage', () => {
  const source = createAnalysis({ durationMs: 10000, shots: [] })
  const report = compareReferenceToSource({ referenceSegments: [{ id: 'ref', startMs: 0, endMs: 1000, action: 'underwater explosion', generatable: false }], sourceAnalysis: source })
  assert.equal(report[0].status, 'impossible')
})

test('requires a capability check before rendering', () => {
  const plan = buildEditPlan({ instruction: 'match reference', sourceAnalysis: createAnalysis({ durationMs: 1000 }) })
  assert.equal(plan.policy.requireCapabilityCheckBeforeRender, true)
  assert.equal(plan.policy.neverInventMissingFootage, true)
})

test('rejects invalid job progress', () => {
  const job = createEditJob({ userId: 'u1', instruction: 'test' })
  assert.throws(() => transitionJob(job, 'processing', 101), /Progress/)
})
