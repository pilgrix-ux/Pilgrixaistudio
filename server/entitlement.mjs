import crypto from 'node:crypto'

const defaultFreeVideoAllowance = Number.parseInt(process.env.FREE_VIDEO_ALLOWANCE || '3', 10)
export const FREE_VIDEO_ALLOWANCE = Number.isFinite(defaultFreeVideoAllowance) && defaultFreeVideoAllowance > 0 ? defaultFreeVideoAllowance : 3
export const DEFAULT_UPGRADE_MESSAGE = 'Hey buddy 😅 it looks like you’ve already used the introductory trial. Upgrade to keep creating videos.'
export const DEFAULT_FREE_TIER_RULES = {
  freeVideoAllowance: FREE_VIDEO_ALLOWANCE,
  maxAccountsPerDevice: 1,
  maxAccountsPerNetwork: 1,
  maxAccountsPerPhone: 1,
  maxHighConfidenceAbuseEvents: 5,
  accountSwitchWindowMs: 7 * 24 * 60 * 60 * 1000,
  riskThreshold: 60,
  phoneVerificationCodeTtlMs: 10 * 60 * 1000,
  maxVerificationAttempts: 5,
  maxVerificationWindowMs: 60 * 1000,
  rateLimits: { signup: { maxPerWindow: 5, windowMs: 60_000 }, loginRecovery: { maxPerWindow: 10, windowMs: 60_000 }, phoneVerification: { maxPerWindow: 5, windowMs: 60_000 }, videoProcessing: { maxPerWindow: 20, windowMs: 60_000 } },
}

const buildEntitlementError = ({ code, message, userMessage, status, details }) => ({ code, message, userMessage, status, details, retryable: false, upgradeRequired: code === 'entitlement_limit_exceeded' || code === 'trial_locked' })
export const hashPrivacySignal = (value) => value == null || String(value).trim() === '' ? null : `sha256:${crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex').slice(0, 32)}`

export function createEntitlementStore(initialRows = []) {
  const rows = new Map(), trialRecords = new Map(), auditEvents = new Map()
  for (const row of initialRows) if (row.user_id) rows.set(row.user_id, { ...row, video_count: Number(row.video_count || 0) })
  return {
    getUser: (id) => rows.get(id) ?? null,
    upsertUser(userId, input = {}) {
      const existing = rows.get(userId) ?? { user_id: userId, plan: 'free', video_count: 0, created_at: new Date().toISOString() }
      const updated = { ...existing, ...input, user_id: userId, plan: input.plan ?? existing.plan ?? 'free', video_count: Number(input.video_count ?? existing.video_count ?? 0), updated_at: new Date().toISOString() }
      rows.set(userId, updated); return updated
    },
    getTrialRecord: (key) => trialRecords.get(key) ?? null,
    upsertTrialRecord(key, input = {}) {
      const existing = trialRecords.get(key) ?? { key, user_ids: [], phone_ids: [], device_ids: [], network_ids: [], deleted_user_ids: [], consumed_count: 0, abuse_score: 0, high_confidence_abuse_events: 0, free_trial_locked_until: null, created_at: new Date().toISOString() }
      const updated = { ...existing, ...input, key, user_ids: Array.from(new Set(input.user_ids ?? existing.user_ids ?? [])), phone_ids: Array.from(new Set(input.phone_ids ?? existing.phone_ids ?? [])), device_ids: Array.from(new Set(input.device_ids ?? existing.device_ids ?? [])), network_ids: Array.from(new Set(input.network_ids ?? existing.network_ids ?? [])), deleted_user_ids: Array.from(new Set(input.deleted_user_ids ?? existing.deleted_user_ids ?? [])), consumed_count: Number(input.consumed_count ?? existing.consumed_count ?? 0), abuse_score: Number(input.abuse_score ?? existing.abuse_score ?? 0), high_confidence_abuse_events: Number(input.high_confidence_abuse_events ?? existing.high_confidence_abuse_events ?? 0), free_trial_locked_until: input.free_trial_locked_until ?? existing.free_trial_locked_until ?? null, updated_at: new Date().toISOString() }
      trialRecords.set(key, updated); return updated
    },
    appendAuditEvent(event) { const audit = { id: `audit-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`, created_at: new Date().toISOString(), ...event }; auditEvents.set(audit.id, audit); return audit },
    listAuditEvents: () => Array.from(auditEvents.values()),
  }
}

// Phone OTP delivery/verification lives in server/otp-service.mjs. This compatibility service deliberately
// does not generate or return OTPs. Callers must inject a provider-backed sendCode implementation.
export function createPhoneVerificationService({ store = createEntitlementStore(), rules = DEFAULT_FREE_TIER_RULES, sendCode } = {}) {
  if (typeof sendCode !== 'function') throw new Error('Phone verification requires a server-side sendCode provider.')
  const keyFor = ({ userId, phoneNumber, country = '' }) => `${userId}:${hashPrivacySignal(phoneNumber)}:${String(country || '').trim().toUpperCase() || 'UNKNOWN'}`
  const records = new Map()
  return {
    async requestCode({ userId, phoneNumber, country = '', deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber)
      if (!userId || !phoneHash) return { ok: false, status: 400, error: { code: 'validation_error', userMessage: 'A valid phone number is required to continue.', status: 400, retryable: false } }
      const key = keyFor({ userId, phoneNumber, country }), current = records.get(key), now = Date.now()
      if (current?.sentAt && now - current.sentAt < (rules.rateLimits.phoneVerification?.windowMs ?? 60_000)) return { ok: false, status: 429, error: { code: 'rate_limited', userMessage: 'Too many verification requests. Please wait and try again.', status: 429, retryable: true } }
      const code = crypto.randomInt(100000, 1000000).toString(), expiresAt = now + rules.phoneVerificationCodeTtlMs
      records.set(key, { codeHash: hashPrivacySignal(`${code}:${userId}:${phoneHash}`), expiresAt, attempts: 0, sentAt: now })
      try { await sendCode({ phoneNumber, country, code, expiresAt: new Date(expiresAt).toISOString() }) } catch { records.delete(key); return { ok: false, status: 502, error: { code: 'delivery_failed', userMessage: 'We could not send the verification message. Please try again.', status: 502, retryable: true } } }
      store.appendAuditEvent({ type: 'phone_verification_requested', user_id: userId, phone_hash: phoneHash, phone_country: String(country || '').trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId) })
      return { ok: true, status: 200, expiresAt: new Date(expiresAt).toISOString() }
    },
    verifyCode({ userId, phoneNumber, country = '', code, deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber), record = records.get(keyFor({ userId, phoneNumber, country }))
      if (!userId || !phoneHash || !code) return { ok: false, status: 400, error: { code: 'validation_error', userMessage: 'Verification failed. Please request a fresh code.', status: 400, retryable: false } }
      if (!record) return { ok: false, status: 404, error: { code: 'not_found', userMessage: 'No pending verification was found. Try requesting a code again.', status: 404, retryable: false } }
      if (Date.now() >= record.expiresAt) { records.delete(keyFor({ userId, phoneNumber, country })); return { ok: false, status: 410, error: { code: 'verification_expired', userMessage: 'The verification code has expired. Please request a new one.', status: 410, retryable: false } }
      const attempts = record.attempts + 1
      if (attempts > rules.maxVerificationAttempts) { records.delete(keyFor({ userId, phoneNumber, country })); return { ok: false, status: 429, error: { code: 'rate_limited', userMessage: 'Too many attempts. Please request a new code later.', status: 429, retryable: true } }
      const expected = hashPrivacySignal(`${String(code).trim()}:${userId}:${phoneHash}`), matches = expected === record.codeHash
      records.set(keyFor({ userId, phoneNumber, country }), { ...record, attempts })
      if (!matches) { store.appendAuditEvent({ type: 'phone_verification_failed', user_id: userId, phone_hash: phoneHash, phone_country: String(country || '').trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId), attempts }); return { ok: false, status: 401, error: { code: 'authentication_error', userMessage: 'That code didn’t match. Please try again.', status: 401, retryable: true } } }
      records.delete(keyFor({ userId, phoneNumber, country })); store.appendAuditEvent({ type: 'phone_verification_succeeded', user_id: userId, phone_hash: phoneHash, phone_country: String(country || '').trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId) }); return { ok: true, status: 200, verified: true }
    },
    getVerificationStatus: ({ userId, phoneNumber, country = '' }) => records.get(keyFor({ userId, phoneNumber, country })) ?? null,
  }
}

export function createTrialEligibilityService({ store = createEntitlementStore(), rules = DEFAULT_FREE_TIER_RULES } = {}) {
  const evaluateSignals = ({ userId, phoneHash, deviceHash, networkHash, emailHash, previousTrialCount = 0, accountDeleted = false, suspiciousVerification = false }) => {
    let riskScore = 0; const signals = []
    for (const [kind, hash, weight] of [['device', deviceHash, 60], ['network', networkHash, 60], ['phone', phoneHash, 60], ['email', emailHash, 25]]) if (hash) { const owners = store.getTrialRecord(`${kind}:${hash}`)?.user_ids ?? []; if (owners.some((id) => id !== userId)) { riskScore += weight; signals.push(`${kind}-account-collision`) } }
    if (accountDeleted || previousTrialCount > 0) { riskScore += 20; signals.push('account-recreate-risk') }
    if (suspiciousVerification) { riskScore += 30; signals.push('suspicious-verification') }
    return { blocked: riskScore >= rules.riskThreshold, riskScore, signals }
  }
  const registerUsage = ({ userId, phoneHash, deviceHash, networkHash, emailHash, accountDeleted = false, consumedCount = 0 }) => { for (const [kind, hash] of [['device', deviceHash], ['network', networkHash], ['phone', phoneHash], ['email', emailHash]]) if (hash) { const key = `${kind}:${hash}`, record = store.getTrialRecord(key) ?? { key, user_ids: [], consumed_count: 0 }; store.upsertTrialRecord(key, { ...record, user_ids: Array.from(new Set([...(record.user_ids ?? []), userId])), consumed_count: Math.max(Number(record.consumed_count ?? 0), Number(consumedCount ?? 0)), deleted_user_ids: accountDeleted ? Array.from(new Set([...(record.deleted_user_ids ?? []), userId])) : record.deleted_user_ids ?? [] }) } }
  return { evaluateSignals, registerUsage }
}

export function createFreeTierEntitlementService({ store = createEntitlementStore(), freeVideoAllowance = FREE_VIDEO_ALLOWANCE, rules = DEFAULT_FREE_TIER_RULES } = {}) {
  const locks = new Map(), trialEligibility = createTrialEligibilityService({ store, rules: { ...rules, freeVideoAllowance } })
  const withLock = async (userId, fn) => { const previous = locks.get(userId) ?? Promise.resolve(); let release; const next = new Promise((resolve) => { release = resolve }); locks.set(userId, next); await previous; try { return await fn() } finally { release(); if (locks.get(userId) === next) locks.delete(userId) } }
  return {
    getUsage: (userId) => Number(store.getUser(userId)?.video_count ?? 0),
    async consume({ userId, authenticated, plan = 'free', requestId, deviceId, networkId, phoneNumber, email, accountDeleted = false, suspiciousVerification = false, clientEntitlement } = {}) {
      if (!authenticated || !userId) return { ok: false, status: 401, error: buildEntitlementError({ code: 'authentication_error', message: 'Authentication is required.', userMessage: 'Please sign in to continue.', status: 401 }), requestId }
      if (plan !== 'free') return { ok: true, status: 200, usage: this.getUsage(userId), remaining: null, limit: null, upgradeRequired: false, paidPlan: true }
      return withLock(userId, async () => {
        if (typeof clientEntitlement !== 'undefined') return { ok: false, status: 403, error: buildEntitlementError({ code: 'client_entitlement_rejected', message: 'Client entitlement values are not trusted.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), requestId }
        const row = store.getUser(userId) ?? store.upsertUser(userId, { user_id: userId, plan: 'free', video_count: 0 }), current = Number(row.video_count || 0)
        const decision = trialEligibility.evaluateSignals({ userId, phoneHash: hashPrivacySignal(phoneNumber), deviceHash: hashPrivacySignal(deviceId), networkHash: hashPrivacySignal(networkId), emailHash: hashPrivacySignal(email), previousTrialCount: current, accountDeleted, suspiciousVerification })
        if (current >= freeVideoAllowance) return { ok: false, status: 403, error: buildEntitlementError({ code: 'entitlement_limit_exceeded', message: 'Free trial allowance exhausted.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), requestId, usage: current, remaining: 0, limit: freeVideoAllowance, upgradeRequired: true }
        if (decision.blocked) return { ok: false, status: 403, error: buildEntitlementError({ code: 'trial_locked', message: 'Free trial blocked by abuse risk.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), requestId, usage: current, remaining: freeVideoAllowance - current, limit: freeVideoAllowance, upgradeRequired: true, riskScore: decision.riskScore, signals: decision.signals }
        const nextUsage = current + 1
        store.upsertUser(userId, { ...row, plan: 'free', video_count: nextUsage })
        trialEligibility.registerUsage({ userId, phoneHash: hashPrivacySignal(phoneNumber), deviceHash: hashPrivacySignal(deviceId), networkHash: hashPrivacySignal(networkId), emailHash: hashPrivacySignal(email), accountDeleted, consumedCount: nextUsage })
        if (requestId) store.upsertTrialRecord(`request:${requestId}`, { consumed: true, user_ids: [userId] })
        return { ok: true, status: 200, requestId, usage: nextUsage, remaining: freeVideoAllowance - nextUsage, limit: freeVideoAllowance, upgradeRequired: false }
      })
    },
  }
}
