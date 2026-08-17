import crypto from 'node:crypto'

const DEFAULT_TTL_MS = 10 * 60 * 1000
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_RESEND_COOLDOWN_MS = 60 * 1000

export const createOtpService = ({
  store,
  sendSms,
  ttlMs = DEFAULT_TTL_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  resendCooldownMs = DEFAULT_RESEND_COOLDOWN_MS,
} = {}) => {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('OTP service requires a key-value store with get/set methods.')
  }

  if (typeof sendSms !== 'function') {
    throw new Error('OTP service requires a server-side sendSms function.')
  }

  const hashCode = (code, subject) => crypto
    .createHmac('sha256', subject)
    .update(String(code))
    .digest('hex')

  const generateCode = () => crypto.randomInt(100000, 1000000).toString()

  const request = async ({ subject, phoneNumber, messagePrefix = 'Your verification code is' }) => {
    if (!subject || !phoneNumber) {
      return { ok: false, status: 400, error: 'A verification subject and phone number are required.' }
    }

    const key = `otp:${subject}`
    const existing = store.get(key)
    const now = Date.now()

    if (existing?.sentAt && now - existing.sentAt < resendCooldownMs) {
      return {
        ok: false,
        status: 429,
        error: 'Please wait before requesting another verification code.',
        retryAfterMs: resendCooldownMs - (now - existing.sentAt),
      }
    }

    const code = generateCode()
    const expiresAt = now + ttlMs

    store.set(key, {
      codeHash: hashCode(code, subject),
      expiresAt,
      attempts: 0,
      sentAt: now,
    })

    try {
      await sendSms({
        phoneNumber,
        message: `${messagePrefix}: ${code}`,
      })
    } catch (error) {
      store.delete?.(key)
      return {
        ok: false,
        status: 502,
        error: 'Verification message could not be sent. Please try again.',
        cause: error,
      }
    }

    // Never return the OTP itself. The client only learns that delivery was requested.
    return {
      ok: true,
      status: 200,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  const verify = ({ subject, code }) => {
    if (!subject || !code) {
      return { ok: false, status: 400, error: 'A verification code is required.' }
    }

    const key = `otp:${subject}`
    const record = store.get(key)

    if (!record) {
      return { ok: false, status: 404, error: 'No active verification code was found.' }
    }

    if (Date.now() >= record.expiresAt) {
      store.delete?.(key)
      return { ok: false, status: 410, error: 'The verification code has expired.' }
    }

    const attempts = Number(record.attempts || 0) + 1
    if (attempts > maxAttempts) {
      store.delete?.(key)
      return { ok: false, status: 429, error: 'Too many verification attempts. Request a new code.' }
    }

    store.set(key, { ...record, attempts })

    const expected = hashCode(String(code).trim(), subject)
    const actual = record.codeHash
    const expectedBuffer = Buffer.from(expected, 'hex')
    const actualBuffer = Buffer.from(actual, 'hex')
    const matches = expectedBuffer.length === actualBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, actualBuffer)

    if (!matches) {
      return { ok: false, status: 401, error: 'The verification code is incorrect.' }
    }

    store.delete?.(key)
    return { ok: true, status: 200, verified: true }
  }

  return { request, verify }
}

export const createMemoryOtpStore = () => {
  const values = new Map()
  return {
    get: (key) => values.get(key),
    set: (key, value) => values.set(key, value),
    delete: (key) => values.delete(key),
  }
}
