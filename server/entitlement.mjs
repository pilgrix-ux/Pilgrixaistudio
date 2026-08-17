import crypto from 'node:crypto'

const defaultFreeVideoAllowance = Number.parseInt(process.env.FREE_VIDEO_ALLOWANCE || '3', 10)
export const FREE_VIDEO_ALLOWANCE = Number.isFinite(defaultFreeVideoAllowance) && defaultFreeVideoAllowance > 0 ? defaultFreeVideoAllowance : 3
export const DEFAULT_UPGRADE_MESSAGE = 'Hey buddy 😅 it looks like you’ve already used the introductory trial. Upgrade to keep creating videos.'
export const DEFAULT_FREE_TIER_RULES = {
  freeVideoAllowance: FREE_VIDEO_ALLOWANCE,
  riskThreshold: 60,
  phoneVerificationCodeTtlMs: 10 * 60 * 1000,
  maxVerificationAttempts: 5,
  rateLimits: { phoneVerification: { maxPerWindow: 5, windowMs: 60_000 }, videoProcessing: { maxPerWindow: 20, windowMs: 60_000 } },
}

const buildEntitlementError = ({ code, message, userMessage, status }) => ({ code, message, userMessage, status, retryable: false, upgradeRequired: code === 'entitlement_limit_exceeded' || code === 'trial_locked' })
export const hashPrivacySignal = (value) => value == null || String(value).trim() === '' ? null : `sha256:${crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex').slice(0, 32)}`

export function createEntitlementStore(initialRows = []) {
  const rows = new Map(), trialRecords = new Map(), auditEvents = new Map()
  for (const row of initialRows) if (row.user_id) rows.set(row.user_id, { ...row, video_count: Number(row.video_count || 0) })
  return {
    getUser: (id) => rows.get(id) ?? null,
    upsertUser(userId, input = {}) {
      const existing = rows.get(userId) ?? { user_id: userId, plan: 'free', video_count: 0, created_at: new Date().toISOString() }
      const updated = { ...existing, ...input, user_id: userId, plan: input.plan ?? existing.plan ?? 'free', video_count: Number(input.video_count ?? existing.video_count ?? 0), updated_at: new Date().toISOString() }
      rows.set(userId, updated)
      return updated
    },
    getTrialRecord: (key) => trialRecords.get(key) ?? null,
    upsertTrialRecord(key, input = {}) {
      const existing = trialRecords.get(key) ?? { key, user_ids: [], consumed_count: 0 }
      const updated = { ...existing, ...input, key, user_ids: Array.from(new Set(input.user_ids ?? existing.user_ids ?? [])), consumed_count: Number(input.consumed_count ?? existing.consumed_count ?? 0), updated_at: new Date().toISOString() }
      trialRecords.set(key, updated)
      return updated
    },
    appendAuditEvent(event) {
      const audit = { id: `audit-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`, created_at: new Date().toISOString(), ...event }
      auditEvents.set(audit.id, audit)
      return audit
    },
    listAuditEvents: () => Array.from(auditEvents.values()),
  }
}

export function createPhoneVerificationService({ store = createEntitlementStore(), rules = DEFAULT_FREE_TIER_RULES, sendCode } = {}) {
  if (typeof sendCode !== 'function') throw new Error('Phone verification requires a server-side sendCode provider.')
  const records = new Map()
  const keyFor = ({ userId, phoneNumber, country = '' }) => `${userId}:${hashPrivacySignal(phoneNumber)}:${String(country).trim().toUpperCase() || 'UNKNOWN'}`

  return {
    async requestCode({ userId, phoneNumber, country = '', deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber)
      if (!userId || !phoneHash) return { ok: false, status: 400, error: { code: 'validation_error', userMessage: 'A valid phone number is required to continue.' } }
      const key = keyFor({ userId, phoneNumber, country })
      const current = records.get(key)
      const now = Date.now()
      if (current?.sentAt && now - current.sentAt < rules.rateLimits.phoneVerification.windowMs) return { ok: false, status: 429, error: { code: 'rate_limited', userMessage: 'Too many verification requests. Please wait and try again.' } }
      const code = crypto.randomInt(100000, 1000000).toString()
      const expiresAt = now + rules.phoneVerificationCodeTtlMs
      records.set(key, { codeHash: hashPrivacySignal(`${code}:${userId}:${phoneHash}`), expiresAt, attempts: 0, sentAt: now })
      try { await sendCode({ phoneNumber, country, code, expiresAt: new Date(expiresAt).toISOString() }) } catch { records.delete(key); return { ok: false, status: 502, error: { code: 'delivery_failed', userMessage: 'We could not send the verification message. Please try again.' } }
      store.appendAuditEvent({ type: 'phone_verification_requested', user_id: userId, phone_hash: phoneHash, phone_country: String(country).trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId) })
      return { ok: true, status: 200, expiresAt: new Date(expiresAt).toISOString() }
    },
    verifyCode({ userId, phoneNumber, country = '', code, deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber)
      if (!userId || !phoneHash || !code) return { ok: false, status: 400, error: { code: 'validation_error', userMessage: 'Verification failed. Please request a fresh code.' } }
      const key = keyFor({ userId, phoneNumber, country }), record = records.get(key)
      if (!record) return { ok: false, status: 404, error: { code: 'not_found', userMessage: 'No pending verification was found. Try requesting a code again.' } }
      if (Date.now() >= record.expiresAt) { records.delete(key); return { ok: false, status: 410, error: { code: 'verification_expired', userMessage: 'The verification code has expired. Please request a new one.' } }
      const attempts = record.attempts + 1
      if (attempts > rules.maxVerificationAttempts) { records.delete(key); return { ok: false, status: 429, error: { code: 'rate_limited', userMessage: 'Too many attempts. Please request a new code later.' } }
      const expected = hashPrivacySignal(`${String(code).trim()}:${userId}:${phoneHash}`)
      records.set(key, { ...record, attempts })
      if (expected !== record.codeHash) { store.appendAuditEvent({ type: 'phone_verification_failed', user_id: userId, phone_hash: phoneHash, phone_country: String(country).trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId), attempts }); return { ok: false, status: 401, error: { code: 'authentication_error', userMessage: 'That code didn’t match. Please try again.' } }
      records.delete(key)
      store.appendAuditEvent({ type: 'phone_verification_succeeded', user_id: userId, phone_hash: phoneHash, phone_country: String(country).trim().toUpperCase() || null, device_hash: hashPrivacySignal(deviceId), network_hash: hashPrivacySignal(networkId) })
      return { ok: true, status: 200, verified: true }
    },
  }
}

export function createTrialEligibilityService({ store = createEntitlementStore(), rules = DEFAULT_FREE_TIER_RULES } = {}) {
  const evaluateSignals = ({ userId, phoneHash, deviceHash, networkHash, emailHash, previousTrialCount = 0, accountDeleted = false, suspiciousVerification = false }) => {
    let riskScore = 0
    const signals = []
    for (const [kind, hash, weight] of [['device', deviceHash, 60], ['network', networkHash, 60], ['phone', phoneHash, 60], ['email', emailHash, 25]]) {
      if (!hash) continue
      const owners = store.getTrialRecord(`${kind}:${hash}`)?.user_ids ?? []
      if (owners.some((id) => id !== userId)) { riskScore += weight; signals.push(`${kind}-account-collision`) }
    }
    if (accountDeleted || previousTrialCount > 0) { riskScore += 20; signals.push('account-recreate-risk') }
    if (suspiciousVerification) { riskScore += 30; signals.push('suspicious-verification') }
    return { blocked: riskScore >= rules.riskThreshold, riskScore, signals }
  }
  const registerUsage = ({ userId, phoneHash, deviceHash, networkHash, emailHash, consumedCount = 0 }) => {
    for (const [kind, hash] of [['device', deviceHash], ['network', networkHash], ['phone', phoneHash], ['email', emailHash]]) {
      if (!hash) continue
      const key = `${kind}:${hash}`
      const record = store.getTrialRecord(key) ?? { key, user_ids: [], consumed_count: 0 }
      store.upsertTrialRecord(key, { ...record, user_ids: Array.from(new Set([...(record.user_ids ?? []), userId])), consumedCount: Math.max(Number(record.consumed_count || 0), Number(consumedCount || 0)) })
    }
  }
  return { evaluateSignals, registerUsage }
}

export function createFreeTierEntitlementService({ store = createEntitlementStore(), freeVideoAllowance = FREE_VIDEO_ALLOWANCE, rules = DEFAULT_FREE_TIER_RULES } = {}) {
  const locks = new Map()
  const trialEligibility = createTrialEligibilityService({ store, rules: { ...rules, freeVideoAllowance } })
  const withLock = async (userId, fn) => { const previous = locks.get(userId) ?? Promise.resolve(); let release; const next = new Promise((resolve) => { release = resolve }); locks.set(userId, next); await previous; try { return await fn() } finally { release(); if (locks.get(userId) === next) locks.delete(userId) } }
  const authorize = ({ userId, authenticated, plan = 'free', deviceId, networkId, phoneNumber, email, accountDeleted = false, suspiciousVerification = false, clientEntitlement } = {}) => {
    if (!authenticated || !userId) return { ok: false, status: 401, error: buildEntitlementError({ code: 'authentication_error', message: 'Authentication is required.', userMessage: 'Please sign in to continue.', status: 401 }) }
    if (typeof clientEntitlement !== 'undefined') return { ok: false, status: 403, error: buildEntitlementError({ code: 'client_entitlement_rejected', message: 'Client entitlement values are not trusted.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }) }
    if (plan !== 'free') return { ok: true, status: 200, usage: this?.getUsage?.(userId) ?? Number(store.getUser(userId)?.video_count ?? 0), remaining: null, limit: null, upgradeRequired: false, paidPlan: true }
    const row = store.getUser(userId) ?? { user_id: userId, plan: 'free', video_count: 0 }
    const current = Number(row.video_count || 0)
    const decision = trialEligibility.evaluateSignals({ userId, phoneHash: hashPrivacySignal(phoneNumber), deviceHash: hashPrivacySignal(deviceId), networkHash: hashPrivacySignal(networkId), emailHash: hashPrivacySignal(email), previousTrialCount: current, accountDeleted, suspiciousVerification })
    if (current >= freeVideoAllowance) return { ok: false, status: 403, error: buildEntitlementError({ code: 'entitlement_limit_exceeded', message: 'Free trial allowance exhausted.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), usage: current, remaining: 0, limit: freeVideoAllowance, upgradeRequired: true }
    if (decision.blocked) return { ok: false, status: 403, error: buildEntitlementError({ code: 'trial_locked', message: 'Free trial blocked by abuse risk.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), usage: current, remaining: freeVideoAllowance - current, limit: freeVideoAllowance, upgradeRequired: true, riskScore: decision.riskScore, signals: decision.signals }
    return { ok: true, status: 200, usage: current, remaining: freeVideoAllowance - current, limit: freeVideoAllowance, upgradeRequired: false, paidPlan: false }
  }
  const consume = async ({ userId, authenticated, plan = 'free', requestId, deviceId, networkId, phoneNumber, email, accountDeleted = false, suspiciousVerification = false, clientEntitlement } = {}) => {
    const authz = authorize({ userId, authenticated, plan, deviceId, networkId, phoneNumber, email, accountDeleted, suspiciousVerification, clientEntitlement })
    if (!authz.ok) return { ...authz, requestId }
    if (authz.paidPlan) return { ...authz, requestId }
    return withLock(userId, async () => {
      const requestKey = requestId ? `request:${requestId}` : null
      if (requestKey && store.getTrialRecord(requestKey)?.consumed) return { ok: true, status: 200, requestId, usage: Number(store.getUser(userId)?.video_count ?? 0), remaining: Math.max(0, freeVideoAllowance - Number(store.getUser(userId)?.video_count ?? 0)), limit: freeVideoAllowance, upgradeRequired: false, idempotent: true }
      const row = store.getUser(userId) ?? store.upsertUser(userId, { user_id: userId, plan: 'free', video_count: 0 })
      const current = Number(row.video_count || 0)
      if (current >= freeVideoAllowance) return { ok: false, status: 403, error: buildEntitlementError({ code: 'entitlement_limit_exceeded', message: 'Free trial allowance exhausted.', userMessage: DEFAULT_UPGRADE_MESSAGE, status: 403 }), requestId, usage: current, remaining: 0, limit: freeVideoAllowance, upgradeRequired: true }
      const nextUsage = current + 1
      store.upsertUser(userId, { ...row, plan: 'free', video_count: nextUsage })
      trialEligibility.registerUsage({ userId, phoneHash: hashPrivacySignal(phoneNumber), deviceHash: hashPrivacySignal(deviceId), networkHash: hashPrivacySignal(networkId), emailHash: hashPrivacySignal(email), consumedCount: nextUsage })
      if (requestKey) store.upsertTrialRecord(requestKey, { consumed: true, user_ids: [userId] })
      return { ok: true, status: 200, requestId, usage: nextUsage, remaining: freeVideoAllowance - nextUsage, limit: freeVideoAllowance, upgradeRequired: false }
    })
  }
  return {
    getUsage: (userId) => Number(store.getUser(userId)?.video_count ?? 0),
    authorize,
    consume,
  }
}
