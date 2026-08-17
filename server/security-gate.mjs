import crypto from 'node:crypto'
import { createOtpService, createMemoryOtpStore } from './otp-service.mjs'
import { hashPrivacySignal } from './entitlement.mjs'

export const DEFAULT_SECURITY_RULES = Object.freeze({ challengeRiskThreshold: 60, blockRiskThreshold: 100, maxFreeVideos: 3, rateLimits: { video: { max: 20, windowMs: 60_000 }, otpRequest: { max: 3, windowMs: 10 * 60_000 } } })
const now = () => Date.now()

export const createSecurityGate = ({ store, sendSms = async () => {}, rules = DEFAULT_SECURITY_RULES } = {}) => {
  const state = store ?? new Map(); const otp = createOtpService({ store: store ?? createMemoryOtpStore(), sendSms })
  const get = async (key) => state.get(key)
  const set = async (key, value, expiresAt = null) => state.set(key, value, expiresAt)
  const rateLimit = async (key, limit) => {
    const current = (await get(`rate:${key}`)) ?? { count: 0, startedAt: now() }
    if (now() - current.startedAt >= limit.windowMs) { await set(`rate:${key}`, { count: 1, startedAt: now() }, now() + limit.windowMs); return { allowed: true, remaining: limit.max - 1 } }
    if (current.count >= limit.max) return { allowed: false, remaining: 0, retryAfterMs: limit.windowMs - (now() - current.startedAt) }
    const next = { ...current, count: current.count + 1 }; await set(`rate:${key}`, next, current.startedAt + limit.windowMs); return { allowed: true, remaining: Math.max(0, limit.max - next.count) }
  }
  const calculateRisk = async ({ userId, deviceId, networkId, phoneNumber, email }) => {
    const signals = []; let score = 0
    for (const [kind, value, weight] of [['device', deviceId, 60], ['network', networkId, 40], ['phone', phoneNumber, 60], ['email', email, 25]]) {
      const hash = hashPrivacySignal(value); if (!hash) continue; const owners = (await get(`signal:${kind}:${hash}`))?.owners ?? []
      if (owners.some((owner) => owner !== userId)) { score += weight; signals.push(`${kind}-reuse`) }
    }
    const account = (await get(`account:${userId}`)) ?? { trialUsed: 0, verificationFailures: 0 }
    if (account.trialUsed > 0) { score += 20; signals.push('trial-reuse') }
    if (account.verificationFailures >= 5) { score += 30; signals.push('verification-failure-pattern') }
    return { score, signals }
  }
  const rememberIdentity = async ({ userId, deviceId, networkId, phoneNumber, email }) => {
    for (const [kind, value] of [['device', deviceId], ['network', networkId], ['phone', phoneNumber], ['email', email]]) {
      const hash = hashPrivacySignal(value); if (!hash) continue; const key = `signal:${kind}:${hash}`; const existing = (await get(key)) ?? { owners: [] }
      await set(key, { ...existing, owners: Array.from(new Set([...existing.owners, userId])) })
    }
  }
  const beginOtpChallenge = async ({ userId, phoneNumber }) => { const limit = await rateLimit(`otp:${hashPrivacySignal(phoneNumber)}`, rules.rateLimits.otpRequest); if (!limit.allowed) return { ok: false, status: 429, error: 'Too many OTP requests. Please try again later.' }; return otp.request({ subject: userId, phoneNumber }) }
  const verifyOtpChallenge = async ({ userId, code }) => otp.verify({ subject: userId, code })
  const authorizeVideo = async ({ userId, authenticated, plan = 'free', deviceId, networkId, phoneNumber, email }) => {
    if (!authenticated || !userId) return { ok: false, status: 401, action: 'authenticate' }; if (plan !== 'free') return { ok: true, status: 200, action: 'allow', paidPlan: true }
    const account = (await get(`account:${userId}`)) ?? { trialUsed: 0, verificationFailures: 0, otpVerified: false }; const risk = await calculateRisk({ userId, deviceId, networkId, phoneNumber, email })
    if (account.trialUsed >= rules.maxFreeVideos) return { ok: false, status: 403, action: 'upgrade', reason: 'trial_exhausted', usage: account.trialUsed }
    if (risk.score >= rules.blockRiskThreshold) return { ok: false, status: 403, action: 'block', riskScore: risk.score, signals: risk.signals }
    if (risk.score >= rules.challengeRiskThreshold && !account.otpVerified) return { ok: false, status: 403, action: 'verify_phone', riskScore: risk.score, signals: risk.signals }
    return { ok: true, status: 200, action: 'allow', usage: account.trialUsed, remaining: rules.maxFreeVideos - account.trialUsed }
  }
  const consumeVideo = async ({ userId, requestId, deviceId, networkId, phoneNumber, email }) => {
    const limit = await rateLimit(`video:${userId}`, rules.rateLimits.video); if (!limit.allowed) return { ok: false, status: 429, error: 'Too many video-processing requests. Please try again later.' }
    const requestKey = requestId ? `request:${requestId}` : null; const existing = requestKey ? await get(requestKey) : null; if (existing?.consumed) return existing.result
    const account = (await get(`account:${userId}`)) ?? { trialUsed: 0, verificationFailures: 0, otpVerified: false }; if (account.trialUsed >= rules.maxFreeVideos) return { ok: false, status: 403, action: 'upgrade', reason: 'trial_exhausted' }
    const result = { ok: true, status: 200, consumed: true, usage: account.trialUsed + 1, remaining: rules.maxFreeVideos - account.trialUsed - 1 }
    await set(`account:${userId}`, { ...account, trialUsed: account.trialUsed + 1 }); await rememberIdentity({ userId, deviceId, networkId, phoneNumber, email }); if (requestKey) await set(requestKey, { consumed: true, result }); return result
  }
  const markOtpVerified = async ({ userId }) => { const account = (await get(`account:${userId}`)) ?? { trialUsed: 0, verificationFailures: 0 }; await set(`account:${userId}`, { ...account, otpVerified: true }); return { ok: true } }
  const markOtpFailure = async ({ userId }) => { const account = (await get(`account:${userId}`)) ?? { trialUsed: 0, verificationFailures: 0 }; await set(`account:${userId}`, { ...account, verificationFailures: Number(account.verificationFailures || 0) + 1 }) }
  return { calculateRisk, rememberIdentity, beginOtpChallenge, verifyOtpChallenge, authorizeVideo, consumeVideo, markOtpVerified, markOtpFailure }
}
export const createSecurityTestStore = () => { const values = new Map(); return { get: (key) => values.get(key), set: (key, value) => values.set(key, value), delete: (key) => values.delete(key) } }
export const createRequestId = () => crypto.randomUUID()
