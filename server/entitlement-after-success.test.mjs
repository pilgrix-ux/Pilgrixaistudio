import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntitlementStore, createFreeTierEntitlementService } from './entitlement.mjs'

test('authorization does not consume a free video', () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })
  const result = service.authorize({ userId: 'user', authenticated: true, plan: 'free' })
  assert.equal(result.ok, true)
  assert.equal(result.usage, 0)
  assert.equal(service.getUsage('user'), 0)
})

test('a failed provider can leave entitlement untouched when consume is never called', () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })
  const authorized = service.authorize({ userId: 'user', authenticated: true, plan: 'free' })
  assert.equal(authorized.ok, true)
  assert.equal(service.getUsage('user'), 0)
})

test('successful processing can consume exactly one free video', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })
  const result = await service.consume({ userId: 'user', authenticated: true, plan: 'free', requestId: 'success-1' })
  assert.equal(result.ok, true)
  assert.equal(result.usage, 1)
  assert.equal(result.remaining, 2)
})

test('failed/retried request can be made idempotent with the same request id', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })
  const first = await service.consume({ userId: 'user', authenticated: true, plan: 'free', requestId: 'same-job' })
  const second = await service.consume({ userId: 'user', authenticated: true, plan: 'free', requestId: 'same-job' })
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(second.usage, 1)
  assert.equal(service.getUsage('user'), 1)
})
