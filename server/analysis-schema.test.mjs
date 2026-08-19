import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTimeline, validateVideoAnalysis, mergeAnalysis } from './analysis-schema.mjs'

test('normalizes millisecond timeline values', () => {
  const items = normalizeTimeline([{ startMs: 1.25, endMs: 2.75 }], 10)
  assert.equal(items[0].startMs, 1.25)
})

test('rejects invalid ranges and out-of-duration timestamps', () => {
  assert.throws(() => normalizeTimeline([{ startMs: 5, endMs: 4 }], 10))
  assert.throws(() => normalizeTimeline([{ startMs: 1, endMs: 11 }], 10))
})

test('validates and merges specialist analysis outputs', () => {
  const base = { durationMs: 100, shots: [], scenes: [], speech: [{ startMs: 10, endMs: 20 }], beats: [], objects: [], actions: [], motion: [], ocr: [], audio: [], metadata: { source: 'speech' } }
  const other = { durationMs: 100, shots: [{ startMs: 30, endMs: 40 }], scenes: [], speech: [], beats: [], objects: [], actions: [], motion: [], ocr: [], audio: [], metadata: { source: 'vision' } }
  const merged = mergeAnalysis([base, other])
  assert.equal(merged.speech.length, 1)
  assert.equal(merged.shots.length, 1)
  assert.equal(merged.metadata.source, 'vision')
  assert.doesNotThrow(() => validateVideoAnalysis(merged))
})
