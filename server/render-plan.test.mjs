import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRenderPlan } from './render-plan.mjs'

test('render plan rejects empty AI plans', () => {
  assert.throws(() => buildRenderPlan({ operations: [], policy: { neverInventMissingFootage: true } }, { durationMs: 1000, inputPath: 'in.mp4', outputPath: 'out.mp4' }), /no executable/i)
})

test('render plan rejects operations outside source duration', () => {
  assert.throws(() => buildRenderPlan({ operations: [{ type: 'trim', startMs: 0, endMs: 1200 }], policy: { neverInventMissingFootage: true } }, { durationMs: 1000, inputPath: 'in.mp4', outputPath: 'out.mp4' }), /invalid time range/i)
})

test('render plan normalizes a valid operation', () => {
  const result = buildRenderPlan({ operations: [{ type: 'trim', startMs: 0, endMs: 1000 }], policy: { neverInventMissingFootage: true } }, { durationMs: 1000, inputPath: 'in.mp4', outputPath: 'out.mp4' })
  assert.equal(result.operations[0].type, 'trim')
  assert.equal(result.ffmpeg[0].startMs, 0)
})
