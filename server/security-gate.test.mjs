import assert from 'node:assert/strict'
import test from 'node:test'
import { createSecurityGate, createSecurityTestStore } from './security-gate.mjs'

test('normal free user is allowed', () => {
  const gate = createSecurityGate({ store: createSecurityTestStore() })
  const result = gate.authorizeVideo({ userId: 'u1', authenticated: true })
  assert.equal(result.action, 'allow')
})

test('paid user bypasses free-tier challenge', () => {
  const gate = createSecurityGate({ store: createSecurityTestStore() })
  const result = gate.authorizeVideo({ userId: 'u1', authenticated: true, plan: 'pro' })
  assert.equal(result.action, 'allow')
  assert.equal(result.paidPlan, true)
})

test('spoofed client identity cannot authorize an unauthenticated request', () => {
  const gate = createSecurityGate({ store: createSecurityTestStore() })
  const result = gate.authorizeVideo({ userId: 'attacker', authenticated: false })
  assert.equal(result.status, 401)
})

test('reused device triggers phone challenge', () => {
  const store = createSecurityTestStore()
  const gate = createSecurityGate({ store })
  gate.rememberIdentity({ userId: 'u1', deviceId: 'device-1' })
  const result = gate.authorizeVideo({ userId: 'u2', authenticated: true, deviceId: 'device-1' })
  assert.equal(result.action, 'verify_phone')
})

test('trial consumption is idempotent by request id', () => {
  const gate = createSecurityGate({ store: createSecurityTestStore() })
  const first = gate.consumeVideo({ userId: 'u1', requestId: 'r1' })
  const second = gate.consumeVideo({ userId: 'u1', requestId: 'r1' })
  assert.equal(first.usage, 1)
  assert.equal(second.usage, 1)
})

test('trial blocks after three consumed videos', () => {
  const gate = createSecurityGate({ store: createSecurityTestStore() })
  gate.consumeVideo({ userId: 'u1', requestId: 'r1' })
  gate.consumeVideo({ userId: 'u1', requestId: 'r2' })
  gate.consumeVideo({ userId: 'u1', requestId: 'r3' })
  const result = gate.consumeVideo({ userId: 'u1', requestId: 'r4' })
  assert.equal(result.action, 'upgrade')
})

test('OTP provider receives the message but client receives no code', async () => {
  let sent
  const gate = createSecurityGate({
    store: createSecurityTestStore(),
    sendSms: async (payload) => { sent = payload },
  })
  const result = await gate.beginOtpChallenge({ userId: 'u1', phoneNumber: '+15550000000' })
  assert.equal(result.ok, true)
  assert.ok(sent?.message)
  assert.equal(result.code, undefined)
})
