import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEntitlementStore,
  createFreeTierEntitlementService,
  createPhoneVerificationService,
  createTrialEligibilityService,
  FREE_VIDEO_ALLOWANCE,
  hashPrivacySignal,
} from './entitlement.mjs'

test('first video is allowed for a free user', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const result = await service.consume({
    userId: 'user-1',
    authenticated: true,
    plan: 'free',
  })

  assert.equal(result.ok, true)
  assert.equal(result.usage, 1)
  assert.equal(result.remaining, FREE_VIDEO_ALLOWANCE - 1)
})

test('second video is allowed for a free user', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  await service.consume({ userId: 'user-2', authenticated: true, plan: 'free' })
  const second = await service.consume({ userId: 'user-2', authenticated: true, plan: 'free' })

  assert.equal(second.ok, true)
  assert.equal(second.usage, 2)
  assert.equal(second.remaining, FREE_VIDEO_ALLOWANCE - 2)
})

test('third video is allowed for a free user', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  for (let index = 0; index < 2; index += 1) {
    const result = await service.consume({ userId: 'user-3', authenticated: true, plan: 'free' })
    assert.equal(result.ok, true)
  }

  const third = await service.consume({ userId: 'user-3', authenticated: true, plan: 'free' })

  assert.equal(third.ok, true)
  assert.equal(third.usage, 3)
  assert.equal(third.remaining, 0)
})

test('fourth video is blocked for an un-upgraded free user', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  for (let index = 0; index < FREE_VIDEO_ALLOWANCE; index += 1) {
    const result = await service.consume({ userId: 'user-4', authenticated: true, plan: 'free' })
    assert.equal(result.ok, true)
  }

  const blocked = await service.consume({ userId: 'user-4', authenticated: true, plan: 'free' })

  assert.equal(blocked.ok, false)
  assert.equal(blocked.error.code, 'entitlement_limit_exceeded')
  assert.equal(blocked.status, 403)
  assert.equal(blocked.usage, FREE_VIDEO_ALLOWANCE)
})

test('repeated requests do not consume the same allowance twice', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({ userId: 'user-5', authenticated: true, plan: 'free' })
  const second = await service.consume({ userId: 'user-5', authenticated: true, plan: 'free' })
  const third = await service.consume({ userId: 'user-5', authenticated: true, plan: 'free' })
  const fourth = await service.consume({ userId: 'user-5', authenticated: true, plan: 'free' })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(third.ok, true)
  assert.equal(fourth.ok, false)
  assert.equal(service.getUsage('user-5'), FREE_VIDEO_ALLOWANCE)
})

test('unauthenticated requests are denied', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const result = await service.consume({
    userId: null,
    authenticated: false,
    plan: 'free',
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 401)
  assert.equal(result.error.code, 'authentication_error')
})

test('normal first account is eligible for the free trial', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const result = await service.consume({
    userId: 'account-1',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-a',
    networkId: 'network-a',
  })

  assert.equal(result.ok, true)
  assert.equal(result.usage, 1)
})

test('deleted account followed by a new account does not reset the free trial', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'deleted-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-reset',
    networkId: 'network-reset',
    accountDeleted: true,
  })

  assert.equal(first.ok, true)

  for (let index = 0; index < FREE_VIDEO_ALLOWANCE - 1; index += 1) {
    const result = await service.consume({
      userId: 'deleted-user',
      authenticated: true,
      plan: 'free',
      deviceId: 'device-reset',
      networkId: 'network-reset',
    })
    assert.equal(result.ok, true)
  }

  const newAccount = await service.consume({
    userId: 'replacement-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-reset',
    networkId: 'network-reset',
    accountDeleted: true,
  })

  assert.equal(newAccount.ok, false)
  assert.equal(newAccount.status, 403)
})

test('multiple accounts from the same device are treated as suspicious', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'device-user-1',
    authenticated: true,
    plan: 'free',
    deviceId: 'shared-device',
    networkId: 'network-1',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'device-user-2',
    authenticated: true,
    plan: 'free',
    deviceId: 'shared-device',
    networkId: 'network-1',
  })

  assert.equal(second.ok, false)
  assert.equal(second.status, 403)
})

test('multiple accounts from the same network are treated as suspicious', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'network-user-1',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-1',
    networkId: 'shared-network',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'network-user-2',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-2',
    networkId: 'shared-network',
  })

  assert.equal(second.ok, false)
  assert.equal(second.status, 403)
})

test('legitimate device change remains allowed for the same authenticated account', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'same-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-old',
    networkId: 'network-old',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'same-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-new',
    networkId: 'network-new',
  })

  assert.equal(second.ok, true)
  assert.equal(second.usage, 2)
})

test('legitimate network change remains allowed for the same authenticated account', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'same-network-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-1',
    networkId: 'network-old',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'same-network-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-2',
    networkId: 'network-new',
  })

  assert.equal(second.ok, true)
  assert.equal(second.usage, 2)
})

test('simultaneous requests do not over-consume the free allowance', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const requests = Array.from({ length: 4 }, () => service.consume({
    userId: 'simultaneous-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-simultaneous',
    networkId: 'network-simultaneous',
  }))

  const results = await Promise.all(requests)
  const allowed = results.filter((result) => result.ok).length
  const blocked = results.filter((result) => !result.ok).length

  assert.equal(allowed, 3)
  assert.equal(blocked, 1)
  assert.equal(service.getUsage('simultaneous-user'), 3)
})

test('modified-client entitlement attempt is rejected', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const result = await service.consume({
    userId: 'tamper-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-tamper',
    networkId: 'network-tamper',
    clientEntitlement: { remaining: 999 },
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 403)
  assert.equal(result.error.code, 'entitlement_limit_exceeded')
})

test('new Gmail + same device is treated as suspicious', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'gmail-device-user-1',
    authenticated: true,
    plan: 'free',
    deviceId: 'shared-email-device',
    networkId: 'network-email-1',
    email: 'user-one@example.com',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'gmail-device-user-2',
    authenticated: true,
    plan: 'free',
    deviceId: 'shared-email-device',
    networkId: 'network-email-2',
    email: 'user-two@example.com',
  })

  assert.equal(second.ok, false)
  assert.equal(second.status, 403)
})

test('new Gmail + new phone remains eligible for a legitimate user', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })
  const result = await service.consume({
    userId: 'recover-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-recovered',
    networkId: 'network-recovered',
    phoneNumber: '+15550000001',
    email: 'new-email@example.com',
  })

  assert.equal(result.ok, true)
  assert.equal(result.usage, 1)
})

test('same phone + multiple accounts is treated as suspicious', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'phone-user-1',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-phone-1',
    networkId: 'network-phone-1',
    phoneNumber: '+15550001000',
  })
  assert.equal(first.ok, true)

  const second = await service.consume({
    userId: 'phone-user-2',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-phone-2',
    networkId: 'network-phone-2',
    phoneNumber: '+15550001000',
  })

  assert.equal(second.ok, false)
  assert.equal(second.status, 403)
})

test('multiple devices for the same authenticated user remain allowed', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const first = await service.consume({
    userId: 'multi-device-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-one',
    networkId: 'network-one',
  })
  const second = await service.consume({
    userId: 'multi-device-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-two',
    networkId: 'network-two',
  })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(second.usage, 2)
})

test('phone verification expires when the code is stale', async () => {
  const store = createEntitlementStore()
  const verification = createPhoneVerificationService({ store })
  const userId = 'phone-expiry-user'
  const phoneNumber = '+15550001111'
  const country = 'US'

  const issued = verification.requestCode({ userId, phoneNumber, country, deviceId: 'device-expiry', networkId: 'network-expiry' })
  assert.equal(issued.ok, true)

  const expiredAt = new Date(Date.now() - 60_000).toISOString()
  const key = `${userId}:${hashPrivacySignal(phoneNumber)}:US`
  const existing = store.getVerificationRecord(key)
  if (existing) {
    store.upsertVerificationRecord(key, {
      ...existing,
      code_expires_at: expiredAt,
    })
  }

  const expired = verification.verifyCode({
    userId,
    phoneNumber,
    country,
    code: issued.code,
    deviceId: 'device-expiry',
    networkId: 'network-expiry',
  })

  assert.equal(expired.ok, false)
  assert.equal(expired.status, 410)
})

test('repeated verification attempts are rejected after mismatch thresholds', async () => {
  const store = createEntitlementStore()
  const verification = createPhoneVerificationService({ store })
  const userId = 'phone-retry-user'
  const phoneNumber = '+15550002222'
  const country = 'US'

  const issued = verification.requestCode({ userId, phoneNumber, country })
  assert.equal(issued.ok, true)

  for (let index = 0; index < 5; index += 1) {
    const result = verification.verifyCode({ userId, phoneNumber, country, code: '000001' })
    if (index < 4) {
      assert.equal(result.ok, false)
    }
  }
})

test('five high-confidence abuse events temporarily lock the free trial', async () => {
  const store = createEntitlementStore()
  const trialService = createTrialEligibilityService({ store })
  const userId = 'abuse-lock-user'
  const deviceHash = 'sha256:device-lock'
  const networkHash = 'sha256:network-lock'

  for (let index = 0; index < 5; index += 1) {
    trialService.recordAbuseEvent({
      userId,
      phoneHash: 'phone-lock',
      deviceHash,
      networkHash,
      emailHash: `email-lock-${index}`,
      reason: 'trial_abuse_event',
    })
  }

  const result = trialService.canUseTrial({
    userId,
    phoneHash: 'phone-lock',
    deviceHash,
    networkHash,
    emailHash: 'email-lock-5',
    consumedCount: 0,
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 403)
})

test('paid user remains authorized after a previous free trial', async () => {
  const service = createFreeTierEntitlementService({ store: createEntitlementStore() })

  const free = await service.consume({
    userId: 'paid-after-free-user',
    authenticated: true,
    plan: 'free',
    deviceId: 'device-paid-after-free',
    networkId: 'network-paid-after-free',
  })
  assert.equal(free.ok, true)

  const paid = await service.consume({
    userId: 'paid-after-free-user',
    authenticated: true,
    plan: 'paid',
    deviceId: 'device-paid-after-free',
    networkId: 'network-paid-after-free',
  })

  assert.equal(paid.ok, true)
  assert.equal(paid.usage, 1)
  assert.equal(paid.upgradeRequired, false)
})
