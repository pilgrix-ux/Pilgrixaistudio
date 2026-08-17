import crypto from 'node:crypto'
import { createOtpService, createMemoryOtpStore } from './otp-service.mjs'
import { hashPrivacySignal } from './entitlement.mjs'

export const DEFAULT_SECURITY_RULES = Object.freeze({
  challengeRiskThreshold: 60,
  blockRiskThreshold: 100,
  maxFreeVideos: 3,
  rateLimits: {
    video: { max: 20, windowMs: 60_000 },
    otpRequest: { max: 3, windowMs: 10 * 60_000 },
  },
})

const now = () => Date.now()

export const createSecurityGate = ({
  store,
  sendSms = async () => {},
  rules = DEFAULT_SECURITY_RULES,
} = {}) => {
  const state = store ?? new Map()
  const otpStore = createMemoryOtpStore()
  const otp = createOtpService({
    store: otpStore,
    sendSms,
  })

  const get = (key) => state instanceof Map ? state.get(key) : state.get(key)
  const set = (key, value) => state instanceof Map ? state.set(key, value) : state.set(key, value)

  const rateLimit = (key, limit) => {
    const current = get(`rate:${key}`) ?? { count: 0, startedAt: now() }
    if (now() - current.startedAt >= limit.windowMs) {
      set(`rate:${key}`, { count: 1, startedAt: now() })
      return { allowed: true, remaining: limit.max - 1 }
    }
    if (current.count >= limit.max) {
      return { allowed: false, remaining: 0, retryAfterMs: limit.windowMs - (now() - current.startedAt) }
    }
    const next = { ...current, count: current.count + 1 }
    set(`rate:${key}`, next)
    return { allowed: true, remaining: Math.max(0, limit.max - next.count) }
  }

  const calculateRisk = ({ userId, deviceId, networkId, phoneNumber, email }) => {
    const signals = []
    let score = 0
    const identifiers = [
      ['device', deviceId, 60],
      ['network', networkId, 40],
      ['phone', phoneNumber, 60],
      ['email', email, 25],
    ]

    for (const [kind, value, weight] of identifiers) {
      const hash = hashPrivacySignal(value)
      if (!hash) continue
      const key = `signal:${kind}:${hash}`
      const owners = get(key)?.owners ?? []
      if (owners.some((owner) => owner !== userId)) {
        score += weight
        signals.push(`${kind}-reuse`)
      }
    }

    const account = get(`account:${userId}`) ?? { trialUsed: 0, verificationFailures: 0 }
    if (account.trialUsed > 0) {
      score += 20
      signals.push('trial-reuse')
    }
    if (account.verificationFailures >= 5) {
      score += 30
      signals.push('verification-failure-pattern')
    }

    return { score, signals }
  }

  const rememberIdentity = ({ userId, deviceId, networkId, phoneNumber, email }) => {
    for (const [kind, value] of [['device', deviceId], ['network', networkId], ['phone', phoneNumber], ['email', email]]) {
      const hash = hashPrivacySignal(value)
      if (!hash) continue
      const key = `signal:${kind}:${hash}`
      const existing = get(key) ?? { owners: [] }
      set(key, { ...existing, owners: Array.from(new Set([...existing.owners, userId])) })
    }
  }

  const beginOtpChallenge = async ({ userId, phoneNumber }) => {
    const limit = rateLimit(`otp:${hashPrivacySignal(phoneNumber)}`, rules.rateLimits.otpRequest)
    if (!limit.allowed) return { ok: false, status: 429, error: 'Too many OTP requests. Please try again later.' }
    return otp.request({ subject: userId, phoneNumber })
  }

  const verifyOtpChallenge = ({ userId, code }) => otp.verify({ subject: userId, code })

  const authorizeVideo = ({ userId, authenticated, plan = 'free', deviceId, networkId, phoneNumber, email }) => {
    if (!authenticated || !userId) return { ok: false, status: 401, action: 'authenticate' }
    if (plan !== 'free') return { ok: true, status: 200, action: 'allow', paidPlan: true }

    const account = get(`account:${userId}`) ?? { trialUsed: 0, verificationFailures: 0, otpVerified: false }
    const risk = calculateRisk({ userId, deviceId, networkId, phoneNumber, email })

    if (account.trialUsed >= rules.maxFreeVideos) return { ok: false, status: 403, action: 'upgrade', reason: 'trial_exhausted', usage: account.trialUsed }
    if (risk.score >= rules.blockRiskThreshold) return { ok: false, status: 403, action: 'block', riskScore: risk.score, signals: risk.signals }
    if (risk.score >= rules.challengeRiskThreshold && !account.otpVerified) {
      return { ok: false, status: 403, action: 'verify_phone', riskScore: risk.score, signals: risk.signals }
    }

    return { ok: true, status: 200, action: 'allow', usage: account.trialUsed, remaining: rules.maxFreeVideos - account.trialUsed }
  }

  const consumeVideo = ({ userId, requestId, deviceId, networkId, phoneNumber, email }) => {
    const limit = rateLimit(`video:${userId}`, rules.rateLimits.video)
    if (!limit.allowed) return { ok: false, status: 429, error: 'Too many video-processing requests. Please try again later.' }

    const requestKey = `request:${requestId}`
    const existing = requestId ? get(requestKey) : null
    if (existing?.consumed) return existing.result

    const account = get(`account:${userId}`) ?? { trialUsed: 0, verificationFailures: 0, otpVerified: false }
    if (account.trialUsed >= rules.maxFreeVideos) return { ok: false, status: 403, action: 'upgrade', reason: 'trial_exhausted' }

    const result = { ok: true, status: 200, consumed: true, usage: account.trialUsed + 1, remaining: rules.maxFreeVideos - account.trialUsed - 1 }
    set(`account:${userId}`, { ...account, trialUsed: account.trialUsed + 1 })
    rememberIdentity({ userId, deviceId, networkId, phoneNumber, email })
    if (requestId) set(requestKey, { consumed: true, result })
    return result
  }

  const markOtpVerified = ({ userId }) => {
    const account = get(`account:${userId}`) ?? { trialUsed: 0, verificationFailures: 0 }
    set(`account:${userId}`, { ...account, otpVerified: true })
    return { ok: true }
  }

  const markOtpFailure = ({ userId }) => {
    const account = get(`account:${userId}`) ?? { trialUsed: 0, verificationFailures: 0 }
    set(`account:${userId}`, { ...account, verificationFailures: Number(account.verificationFailures || 0) + 1 })
  }

  return { calculateRisk, rememberIdentity, beginOtpChallenge, verifyOtpChallenge, authorizeVideo, consumeVideo, markOtpVerified, markOtpFailure }
}

export const createSecurityTestStore = () => new Map()

export const createRequestId = () => crypto.randomUUID()
