import crypto from 'node:crypto'

const defaultFreeVideoAllowance = Number.parseInt(process.env.FREE_VIDEO_ALLOWANCE || '3', 10)

export const FREE_VIDEO_ALLOWANCE = Number.isFinite(defaultFreeVideoAllowance) && defaultFreeVideoAllowance > 0
  ? defaultFreeVideoAllowance
  : 3

export const DEFAULT_UPGRADE_MESSAGE = 'Hey buddy 😅 it looks like you’ve already used the introductory trial. Upgrade to keep creating videos.'

export const DEFAULT_FREE_TIER_RULES = {
  freeVideoAllowance: FREE_VIDEO_ALLOWANCE,
  maxAccountsPerDevice: 1,
  maxAccountsPerNetwork: 1,
  maxAccountsPerPhone: 1,
  maxHighConfidenceAbuseEvents: 5,
  accountSwitchWindowMs: 1000 * 60 * 60 * 24 * 7,
  riskThreshold: 60,
  phoneVerificationCodeTtlMs: 10 * 60 * 1000,
  maxVerificationAttempts: 5,
  maxVerificationWindowMs: 60 * 1000,
  rateLimits: {
    signup: { maxPerWindow: 5, windowMs: 60_000 },
    loginRecovery: { maxPerWindow: 10, windowMs: 60_000 },
    phoneVerification: { maxPerWindow: 5, windowMs: 60_000 },
    videoProcessing: { maxPerWindow: 20, windowMs: 60_000 },
  },
}

const buildEntitlementError = ({ code, message, userMessage, status, details }) => ({
  code,
  message,
  userMessage,
  status,
  details,
  retryable: false,
  upgradeRequired: code === 'entitlement_limit_exceeded' || code === 'trial_locked',
})

export const hashPrivacySignal = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null
  }

  return `sha256:${crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex')
    .slice(0, 32)}`
}

export function createEntitlementStore(initialRows = []) {
  const rows = new Map()
  const trialRecords = new Map()
  const verificationRecords = new Map()
  const auditEvents = new Map()

  for (const row of initialRows) {
    if (row.user_id) {
      rows.set(row.user_id, {
        ...row,
        video_count: Number(row.video_count || 0),
      })
    }
  }

  return {
    getUser(userId) {
      return rows.get(userId) ?? null
    },

    upsertUser(userId, input = {}) {
      const existing = rows.get(userId) ?? {
        user_id: userId,
        plan: 'free',
        video_count: 0,
        created_at: new Date().toISOString(),
      }

      const updated = {
        ...existing,
        ...input,
        user_id: userId,
        plan: input.plan ?? existing.plan ?? 'free',
        video_count: Number(input.video_count ?? existing.video_count ?? 0),
        updated_at: new Date().toISOString(),
      }

      rows.set(userId, updated)
      return updated
    },

    getTrialRecord(key) {
      return trialRecords.get(key) ?? null
    },

    upsertTrialRecord(key, input = {}) {
      const existing = trialRecords.get(key) ?? {
        key,
        user_ids: [],
        phone_ids: [],
        device_ids: [],
        network_ids: [],
        deleted_user_ids: [],
        consumed_count: 0,
        abuse_score: 0,
        high_confidence_abuse_events: 0,
        free_trial_locked_until: null,
        created_at: new Date().toISOString(),
      }

      const updated = {
        ...existing,
        ...input,
        key,
        user_ids: Array.from(new Set([...(input.user_ids ?? existing.user_ids ?? []), ...(input.user_ids ?? existing.user_ids ?? [])])),
        phone_ids: Array.from(new Set([...(input.phone_ids ?? existing.phone_ids ?? [])])),
        device_ids: Array.from(new Set([...(input.device_ids ?? existing.device_ids ?? [])])),
        network_ids: Array.from(new Set([...(input.network_ids ?? existing.network_ids ?? [])])),
        deleted_user_ids: Array.from(new Set([...(input.deleted_user_ids ?? existing.deleted_user_ids ?? [])])),
        consumed_count: Number(input.consumed_count ?? existing.consumed_count ?? 0),
        abuse_score: Number(input.abuse_score ?? existing.abuse_score ?? 0),
        high_confidence_abuse_events: Number(input.high_confidence_abuse_events ?? existing.high_confidence_abuse_events ?? 0),
        free_trial_locked_until: input.free_trial_locked_until ?? existing.free_trial_locked_until ?? null,
        updated_at: new Date().toISOString(),
      }

      trialRecords.set(key, updated)
      return updated
    },

    getVerificationRecord(key) {
      return verificationRecords.get(key) ?? null
    },

    upsertVerificationRecord(key, input = {}) {
      const existing = verificationRecords.get(key) ?? {
        key,
        user_id: null,
        phone_hash: null,
        phone_country: null,
        code_hash: null,
        code_expires_at: null,
        attempts: 0,
        last_attempt_at: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      const updated = {
        ...existing,
        ...input,
        key,
        user_id: input.user_id ?? existing.user_id ?? null,
        phone_hash: input.phone_hash ?? existing.phone_hash ?? null,
        phone_country: input.phone_country ?? existing.phone_country ?? null,
        code_hash: input.code_hash ?? existing.code_hash ?? null,
        code_expires_at: input.code_expires_at ?? existing.code_expires_at ?? null,
        attempts: Number(input.attempts ?? existing.attempts ?? 0),
        last_attempt_at: input.last_attempt_at ?? existing.last_attempt_at ?? null,
        status: input.status ?? existing.status ?? 'pending',
        updated_at: new Date().toISOString(),
      }

      verificationRecords.set(key, updated)
      return updated
    },

    appendAuditEvent(event) {
      const audit = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        ...event,
      }
      auditEvents.set(audit.id, audit)
      return audit
    },

    listAuditEvents() {
      return Array.from(auditEvents.values())
    },
  }
}

export function createPhoneVerificationService({
  store = createEntitlementStore(),
  rules = DEFAULT_FREE_TIER_RULES,
} = {}) {
  const createPhoneKey = ({ userId, phoneNumber, country = '' }) => {
    const phoneHash = hashPrivacySignal(phoneNumber)
    const region = String(country || '').trim().toUpperCase() || 'UNKNOWN'
    return `${userId}:${phoneHash}:${region}`
  }

  return {
    requestCode({ userId, phoneNumber, country = '', deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber)
      if (!userId || !phoneHash) {
        return {
          ok: false,
          status: 400,
          error: {
            code: 'validation_error',
            message: 'A verified phone number is required.',
            userMessage: 'A valid phone number is required to continue.',
            status: 400,
            retryable: false,
          },
        }
      }

      const key = createPhoneKey({ userId, phoneNumber, country })
      const record = store.getVerificationRecord(key)
      const now = Date.now()
      const attemptWindowMs = rules.maxVerificationWindowMs || 60_000
      const attemptsForWindow = record && record.last_attempt_at
        ? Number(record.attempts ?? 0)
        : 0

      if (record && attemptsForWindow >= rules.maxVerificationAttempts) {
        return {
          ok: false,
          status: 429,
          error: {
            code: 'rate_limited',
            message: 'Too many verification attempts were made for this phone number.',
            userMessage: 'Too many verification attempts were made. Please wait a bit and try again.',
            status: 429,
            retryable: true,
          },
        }
      }

      const code = Math.random().toString().slice(2, 8).padStart(6, '0')
      const codeHash = hashPrivacySignal(`${code}:${userId}:${phoneHash}`)
      const expiresAt = new Date(now + rules.phoneVerificationCodeTtlMs).toISOString()

      store.upsertVerificationRecord(key, {
        key,
        user_id: userId,
        phone_hash: phoneHash,
        phone_country: String(country || '').trim().toUpperCase() || null,
        code_hash: codeHash,
        code_expires_at: expiresAt,
        attempts: 0,
        last_attempt_at: new Date(now).toISOString(),
        status: 'pending',
      })

      store.appendAuditEvent({
        type: 'phone_verification_requested',
        user_id: userId,
        phone_hash: phoneHash,
        phone_country: String(country || '').trim().toUpperCase() || null,
        device_hash: hashPrivacySignal(deviceId),
        network_hash: hashPrivacySignal(networkId),
      })

      return {
        ok: true,
        status: 200,
        code,
        phoneHash,
        country: String(country || '').trim().toUpperCase() || null,
        expiresAt,
      }
    },

    verifyCode({ userId, phoneNumber, country = '', code, deviceId = '', networkId = '' }) {
      const phoneHash = hashPrivacySignal(phoneNumber)
      if (!userId || !phoneHash || !code) {
        return {
          ok: false,
          status: 400,
          error: {
            code: 'validation_error',
            message: 'The verification code is missing or invalid.',
            userMessage: 'Verification failed. Please request a fresh code.',
            status: 400,
            retryable: false,
          },
        }
      }

      const key = createPhoneKey({ userId, phoneNumber, country })
      const record = store.getVerificationRecord(key)
      if (!record) {
        return {
          ok: false,
          status: 404,
          error: {
            code: 'not_found',
            message: 'No phone verification is in progress for this user.',
            userMessage: 'No pending verification was found. Try requesting a code again.',
            status: 404,
            retryable: false,
          },
        }
      }

      if (record.code_expires_at && new Date(record.code_expires_at).getTime() < Date.now()) {
        return {
          ok: false,
          status: 410,
          error: {
            code: 'verification_expired',
            message: 'The verification code expired.',
            userMessage: 'The verification code has expired. Please request a new one.',
            status: 410,
            retryable: false,
          },
        }
      }

      const normalizedCode = String(code).trim()
      const expectedHash = record.code_hash
      const matches = expectedHash === hashPrivacySignal(`${normalizedCode}:${userId}:${phoneHash}`)
      const attemptCount = Number(record.attempts ?? 0) + 1

      store.upsertVerificationRecord(key, {
        ...record,
        attempts: attemptCount,
        last_attempt_at: new Date().toISOString(),
        status: matches ? 'verified' : 'pending',
      })

      if (!matches) {
        store.appendAuditEvent({
          type: 'phone_verification_failed',
          user_id: userId,
          phone_hash: phoneHash,
          phone_country: String(country || '').trim().toUpperCase() || null,
          device_hash: hashPrivacySignal(deviceId),
          network_hash: hashPrivacySignal(networkId),
          attempts: attemptCount,
        })

        return {
          ok: false,
          status: 401,
          error: {
            code: 'authentication_error',
            message: 'The verification code is incorrect.',
            userMessage: 'That code didn’t match. Please try again.',
            status: 401,
            retryable: true,
          },
        }
      }

      store.appendAuditEvent({
        type: 'phone_verification_succeeded',
        user_id: userId,
        phone_hash: phoneHash,
        phone_country: String(country || '').trim().toUpperCase() || null,
        device_hash: hashPrivacySignal(deviceId),
        network_hash: hashPrivacySignal(networkId),
      })

      return {
        ok: true,
        status: 200,
        verified: true,
        phoneHash,
        country: String(country || '').trim().toUpperCase() || null,
      }
    },

    getVerificationStatus({ userId, phoneNumber, country = '' }) {
      const key = createPhoneKey({ userId, phoneNumber, country })
      return store.getVerificationRecord(key) ?? null
    },
  }
}

export function createTrialEligibilityService({
  store = createEntitlementStore(),
  rules = DEFAULT_FREE_TIER_RULES,
} = {}) {
  const evaluateSignals = ({
    userId,
    phoneHash,
    deviceHash,
    networkHash,
    emailHash,
    previousTrialCount = 0,
    accountDeleted = false,
    suspiciousVerification = false,
  }) => {
    let riskScore = 0
    const signals = []

    if (deviceHash) {
      const deviceRecord = store.getTrialRecord(`device:${deviceHash}`) ?? { user_ids: [] }
      const otherUsers = (deviceRecord.user_ids ?? []).filter((id) => id !== userId)
      if (otherUsers.length > 0) {
        riskScore += 60
        signals.push('device-account-collision')
      }
    }

    if (networkHash) {
      const networkRecord = store.getTrialRecord(`network:${networkHash}`) ?? { user_ids: [] }
      const otherUsers = (networkRecord.user_ids ?? []).filter((id) => id !== userId)
      if (otherUsers.length > 0) {
        riskScore += 60
        signals.push('network-account-collision')
      }
    }

    if (phoneHash) {
      const phoneRecord = store.getTrialRecord(`phone:${phoneHash}`) ?? { user_ids: [] }
      const otherUsers = (phoneRecord.user_ids ?? []).filter((id) => id !== userId)
      if (otherUsers.length > 0) {
        riskScore += 60
        signals.push('phone-account-collision')
      }
    }

    if (emailHash) {
      const emailRecord = store.getTrialRecord(`email:${emailHash}`) ?? { user_ids: [] }
      const otherUsers = (emailRecord.user_ids ?? []).filter((id) => id !== userId)
      if (otherUsers.length > 0) {
        riskScore += 25
        signals.push('email-reuse-risk')
      }
    }

    if (accountDeleted || previousTrialCount > 0) {
      riskScore += 20
      signals.push('account-recreate-risk')
    }

    if (suspiciousVerification) {
      riskScore += 30
      signals.push('suspicious-verification')
    }

    return {
      blocked: riskScore >= rules.riskThreshold,
      riskScore,
      signals,
    }
  }

  const registerUsage = ({ userId, phoneHash, deviceHash, networkHash, emailHash, accountDeleted = false, consumedCount = 0 }) => {
    const keys = [
      deviceHash ? `device:${deviceHash}` : null,
      networkHash ? `network:${networkHash}` : null,
      phoneHash ? `phone:${phoneHash}` : null,
      emailHash ? `email:${emailHash}` : null,
    ].filter(Boolean)

    for (const key of keys) {
      const record = store.getTrialRecord(key) ?? {
        key,
        user_ids: [],
        device_ids: [],
        network_ids: [],
        phone_ids: [],
        deleted_user_ids: [],
        consumed_count: 0,
        abuse_score: 0,
        high_confidence_abuse_events: 0,
      }

      const next = {
        ...record,
        key,
        user_ids: Array.from(new Set([...(record.user_ids ?? []), userId])),
        device_ids: deviceHash && key.startsWith('device:') ? Array.from(new Set([...(record.device_ids ?? []), deviceHash])) : record.device_ids ?? [],
        network_ids: networkHash && key.startsWith('network:') ? Array.from(new Set([...(record.network_ids ?? []), networkHash])) : record.network_ids ?? [],
        phone_ids: phoneHash && key.startsWith('phone:') ? Array.from(new Set([...(record.phone_ids ?? []), phoneHash])) : record.phone_ids ?? [],
        deleted_user_ids: accountDeleted ? Array.from(new Set([...(record.deleted_user_ids ?? []), userId])) : record.deleted_user_ids ?? [],
        consumed_count: Number(consumedCount || record.consumed_count || 0),
        updated_at: new Date().toISOString(),
      }

      store.upsertTrialRecord(key, next)
    }
  }

  const recordAbuseEvent = ({ userId, phoneHash, deviceHash, networkHash, emailHash, reason = 'trial_abuse_event' }) => {
    const keys = [
      userId ? `user:${userId}` : null,
      phoneHash ? `phone:${phoneHash}` : null,
      deviceHash ? `device:${deviceHash}` : null,
      networkHash ? `network:${networkHash}` : null,
      emailHash ? `email:${emailHash}` : null,
    ].filter(Boolean)

    for (const key of keys) {
      const record = store.getTrialRecord(key) ?? {
        key,
        user_ids: [],
        phone_ids: [],
        device_ids: [],
        network_ids: [],
        abuse_score: 0,
        high_confidence_abuse_events: 0,
        free_trial_locked_until: null,
      }

      const nextAbuseEvents = Number(record.high_confidence_abuse_events ?? 0) + 1
      const nextScore = Number(record.abuse_score ?? 0) + 1
      const lockUntil = nextAbuseEvents >= rules.maxHighConfidenceAbuseEvents
        ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
        : record.free_trial_locked_until ?? null

      const next = {
        ...record,
        key,
        user_ids: Array.from(new Set([...(record.user_ids ?? []), userId].filter(Boolean))),
        phone_ids: phoneHash && key.startsWith('phone:') ? Array.from(new Set([...(record.phone_ids ?? []), phoneHash])) : record.phone_ids ?? [],
        device_ids: deviceHash && key.startsWith('device:') ? Array.from(new Set([...(record.device_ids ?? []), deviceHash])) : record.device_ids ?? [],
        network_ids: networkHash && key.startsWith('network:') ? Array.from(new Set([...(record.network_ids ?? []), networkHash])) : record.network_ids ?? [],
        abuse_score: nextScore,
        high_confidence_abuse_events: nextAbuseEvents,
        free_trial_locked_until: lockUntil,
        updated_at: new Date().toISOString(),
      }

      store.upsertTrialRecord(key, next)
      store.appendAuditEvent({
        type: 'trial_abuse_event',
        user_id: userId,
        signal_key: key,
        reason,
        abuse_score: nextScore,
        high_confidence_abuse_events: nextAbuseEvents,
      })
    }
  }

  return {
    evaluateSignals,
    registerUsage,
    recordAbuseEvent,
    canUseTrial({
      userId,
      phoneHash,
      deviceHash,
      networkHash,
      emailHash,
      previousTrialCount = 0,
      accountDeleted = false,
      suspiciousVerification = false,
      consumedCount = 0,
    }) {
      const userRecord = store.getTrialRecord(`user:${userId}`) ?? { user_ids:[userId], abuse_score:0, high_confidence_abuse_events:0, free_trial_locked_until:null }
      const signals = evaluateSignals({
        userId,
        phoneHash,
        deviceHash,
        networkHash,
        emailHash,
        previousTrialCount,
        accountDeleted,
        suspiciousVerification,
      })

      if (userRecord.free_trial_locked_until && new Date(userRecord.free_trial_locked_until).getTime() > Date.now()) {
        return {
          ok: false,
          status: 403,
          error: buildEntitlementError({
            code: 'trial_locked',
            message: 'The free trial is temporarily locked because of repeated abuse.',
            userMessage: DEFAULT_UPGRADE_MESSAGE,
            status: 403,
            details: {
              upgradeRequired: true,
              lockUntil: userRecord.free_trial_locked_until,
            },
          }),
          abuseScore: Number(userRecord.abuse_score ?? 0),
          highConfidenceAbuseEvents: Number(userRecord.high_confidence_abuse_events ?? 0),
          blocked: true,
          signals,
        }
      }

      if (consumedCount >= rules.freeVideoAllowance) {
        return {
          ok: false,
          status: 403,
          error: buildEntitlementError({
            code: 'entitlement_limit_exceeded',
            message: 'The free trial allowance has already been used.',
            userMessage: DEFAULT_UPGRADE_MESSAGE,
            status: 403,
            details: {
              used: consumedCount,
              limit: rules.freeVideoAllowance,
              upgradeRequired: true,
            },
          }),
          abuseScore: Number(userRecord.abuse_score ?? 0),
          highConfidenceAbuseEvents: Number(userRecord.high_confidence_abuse_events ?? 0),
          blocked: true,
          signals,
        }
      }

      if (signals.blocked) {
        return {
          ok: false,
          status: 403,
          error: buildEntitlementError({
            code: 'entitlement_limit_exceeded',
            message: 'The free trial was blocked because the risk pattern looked like repeated abuse.',
            userMessage: DEFAULT_UPGRADE_MESSAGE,
            status: 403,
            details: {
              reason: signals.signals.join(', '),
              riskScore: signals.riskScore,
              upgradeRequired: true,
            },
          }),
          abuseScore: Number(userRecord.abuse_score ?? 0),
          highConfidenceAbuseEvents: Number(userRecord.high_confidence_abuse_events ?? 0),
          blocked: true,
          signals,
        }
      }

      return {
        ok: true,
        status: 200,
        abuseScore: Number(userRecord.abuse_score ?? 0),
        highConfidenceAbuseEvents: Number(userRecord.high_confidence_abuse_events ?? 0),
        blocked: false,
        signals,
      }
    },
  }
}

export function createFreeTierEntitlementService({
  store = createEntitlementStore(),
  freeVideoAllowance = FREE_VIDEO_ALLOWANCE,
  rules = DEFAULT_FREE_TIER_RULES,
} = {}) {
  const mutexes = new Map()
  const trialEligibility = createTrialEligibilityService({ store, rules: { ...rules, freeVideoAllowance } })

  const withLock = async (userId, callback) => {
    if (!userId) {
      return callback()
    }

    if (!mutexes.has(userId)) {
      mutexes.set(userId, Promise.resolve())
    }

    let releaseLock
    const previous = mutexes.get(userId)
    const next = new Promise((resolve) => {
      releaseLock = resolve
    })
    mutexes.set(userId, next)

    await previous
    try {
      return await callback()
    } finally {
      releaseLock()
    }
  }

  return {
    getUsage(userId) {
      if (!userId) return 0
      const row = store.getUser(userId)
      return row ? Number(row.video_count || 0) : 0
    },

    async consume({
      userId,
      authenticated,
      plan = 'free',
      requestId,
      deviceId,
      networkId,
      phoneNumber,
      email,
      accountDeleted = false,
      suspiciousVerification = false,
      clientEntitlement,
    }) {
      if (!authenticated || !userId) {
        return {
          ok: false,
          status: 401,
          error: buildEntitlementError({
            code: 'authentication_error',
            message: 'Authentication is required to consume a video processing allocation.',
            userMessage: 'Please sign in to continue.',
            status: 401,
          }),
          requestId,
          usage: 0,
          remaining: freeVideoAllowance,
          limit: freeVideoAllowance,
          upgradeRequired: false,
        }
      }

      if (plan !== 'free') {
        return {
          ok: true,
          status: 200,
          error: null,
          requestId,
          usage: this.getUsage(userId),
          remaining: freeVideoAllowance,
          limit: freeVideoAllowance,
          upgradeRequired: false,
          paidPlan: true,
        }
      }

      return withLock(userId, async () => {
        const row = store.getUser(userId) ?? store.upsertUser(userId, {
          user_id: userId,
          plan: 'free',
          video_count: 0,
          created_at: new Date().toISOString(),
        })

        const currentUsage = Number(row.video_count || 0)
        const deviceHash = hashPrivacySignal(deviceId)
        const networkHash = hashPrivacySignal(networkId)
        const phoneHash = hashPrivacySignal(phoneNumber)
        const emailHash = hashPrivacySignal(email)

        const decision = trialEligibility.canUseTrial({
          userId,
          phoneHash,
          deviceHash,
          networkHash,
          emailHash,
          previousTrialCount: currentUsage,
          accountDeleted,
          suspiciousVerification,
          consumedCount: currentUsage,
        })

        if (typeof clientEntitlement !== 'undefined') {
          const response = {
            ok: false,
            status: 403,
            error: buildEntitlementError({
              code: 'entitlement_limit_exceeded',
              message: 'Client-provided entitlement values are ignored; only the server-side entitlement is trusted.',
              userMessage: DEFAULT_UPGRADE_MESSAGE,
              status: 403,
              details: { upgradeRequired: true },
            }),
            requestId,
            usage: currentUsage,
            remaining: Math.max(0, freeVideoAllowance - currentUsage),
            limit: freeVideoAllowance,
            upgradeRequired: true,
          }

          store.appendAuditEvent({
            type: 'client_entitlement_tamper_rejected',
            user_id: userId,
            device_hash: deviceHash,
            network_hash: networkHash,
            phone_hash: phoneHash,
            email_hash: emailHash,
          })
          return response
        }

        if (!decision.ok) {
          return {
            ok: false,
            status: decision.status,
            error: decision.error,
            requestId,
            usage: currentUsage,
            remaining: Math.max(0, freeVideoAllowance - currentUsage),
            limit: freeVideoAllowance,
            upgradeRequired: true,
          }
        }

        if (currentUsage >= freeVideoAllowance) {
          return {
            ok: false,
            status: 403,
            error: buildEntitlementError({
              code: 'entitlement_limit_exceeded',
              message: `Free tier video allowance exhausted for user ${userId}.`,
              userMessage: DEFAULT_UPGRADE_MESSAGE,
              status: 403,
              details: { plan: 'free', limit: freeVideoAllowance, used: currentUsage, upgradeRequired: true },
            }),
            requestId,
            usage: currentUsage,
            remaining: 0,
            limit: freeVideoAllowance,
            upgradeRequired: true,
          }
        }

        const nextUsage = currentUsage + 1
        const updated = store.upsertUser(userId, {
          ...row,
          plan: 'free',
          video_count: nextUsage,
          updated_at: new Date().toISOString(),
        })

        trialEligibility.registerUsage({
          userId,
          phoneHash,
          deviceHash,
          networkHash,
          emailHash,
          accountDeleted,
          consumedCount: nextUsage,
        })

        const userRecord = store.getTrialRecord(`user:${userId}`) ?? { user_ids:[userId], consumed_count: 0, abuse_score:0, high_confidence_abuse_events:0 }
        store.upsertTrialRecord(`user:${userId}`, {
          ...userRecord,
          user_ids: Array.from(new Set([...(userRecord.user_ids ?? []), userId])),
          consumed_count: nextUsage,
          updated_at: new Date().toISOString(),
        })

        store.appendAuditEvent({
          type: 'free_trial_usage_consumed',
          user_id: userId,
          usage: nextUsage,
          limit: freeVideoAllowance,
          device_hash: deviceHash,
          network_hash: networkHash,
          phone_hash: phoneHash,
          email_hash: emailHash,
        })

        return {
          ok: true,
          status: 200,
          error: null,
          requestId,
          usage: Number(updated.video_count || 0),
          remaining: Math.max(0, freeVideoAllowance - Number(updated.video_count || 0)),
          limit: freeVideoAllowance,
          upgradeRequired: false,
        }
      })
    },
  }
}
