import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemoryOtpStore, createOtpService } from './otp-service.mjs'

test('OTP is sent without returning the code', async () => {
  const store = createMemoryOtpStore()
  let delivered = null
  const otp = createOtpService({
    store,
    sendSms: async ({ phoneNumber, message }) => {
      delivered = { phoneNumber, message }
    },
  })

  const result = await otp.request({ subject: 'user-1', phoneNumber: '+2348000000000' })

  assert.equal(result.ok, true)
  assert.equal(Object.hasOwn(result, 'code'), false)
  assert.match(delivered.message, /^Your verification code is: \d{6}$/)

  const code = delivered.message.match(/\d{6}$/)[0]
  const verification = await otp.verify({ subject: 'user-1', code })
  assert.equal(verification.verified, true)
})

test('OTP cannot be guessed after the attempt limit', async () => {
  const store = createMemoryOtpStore()
  const otp = createOtpService({
    store,
    maxAttempts: 2,
    sendSms: async () => {},
  })

  await otp.request({ subject: 'user-2', phoneNumber: '+2348000000000' })
  assert.equal((await otp.verify({ subject: 'user-2', code: '000000' })).status, 401)
  assert.equal((await otp.verify({ subject: 'user-2', code: '000000' })).status, 401)
  assert.equal((await otp.verify({ subject: 'user-2', code: '000000' })).status, 429)
})

test('failed SMS delivery does not leave a usable OTP', async () => {
  const store = createMemoryOtpStore()
  const otp = createOtpService({
    store,
    sendSms: async () => { throw new Error('provider unavailable') },
  })

  const result = await otp.request({ subject: 'user-3', phoneNumber: '+2348000000000' })
  assert.equal(result.ok, false)
  assert.equal(store.get('otp:user-3'), undefined)
})
