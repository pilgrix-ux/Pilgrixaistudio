import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRenderPlan } from './render-engine.mjs'

test('accepts supported millisecond render operations', () => {
  assert.equal(validateRenderPlan({ policy: { neverInventMissingFootage: true }, operations: [
    { type: 'trim', startMs: 2137, endMs: 3684 },
    { type: 'zoom', startMs: 3684, amount: 1.2 },
    { type: 'fade', startMs: 4000, durationMs: 250 },
    { type: 'text', startMs: 5000, text: 'Pilgrix' },
  ] }), true)
})

test('rejects unsupported operations', () => {
  assert.throws(() => validateRenderPlan({ policy: { neverInventMissingFootage: true }, operations: [{ type: 'magic', startMs: 0 }] }), /Unsupported render operation/)
})

test('rejects invalid timestamps', () => {
  assert.throws(() => validateRenderPlan({ policy: { neverInventMissingFootage: true }, operations: [{ type: 'cut', startMs: 20, endMs: 10 }] }), /endMs/)
})

test('rejects plans that allow invented footage', () => {
  assert.throws(() => validateRenderPlan({ policy: { neverInventMissingFootage: false }, operations: [] }), /forbid invented/)
})
