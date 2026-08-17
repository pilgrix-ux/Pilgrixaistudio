import http from 'node:http'

import { createFreeTierEntitlementService, FREE_VIDEO_ALLOWANCE, hashPrivacySignal } from './entitlement.mjs'

const PORT = Number(process.env.AI_BACKEND_PORT || 3001)
const AI_PROVIDER = process.env.AI_PROVIDER || 'none'
const AI_API_URL = process.env.AI_API_URL || ''
const AI_MODEL = process.env.AI_MODEL || 'not-configured'
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000)
const rateLimitStore = new Map()
const entitlementService = createFreeTierEntitlementService({
  freeVideoAllowance: Number.parseInt(process.env.FREE_VIDEO_ALLOWANCE || String(FREE_VIDEO_ALLOWANCE), 10),
})

const fromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || String(fallback), 10)
  return Number.isFinite(value) ? value : fallback
}

const signupRateLimit = {
  maxPerWindow: fromEnv('FREE_TRIAL_SIGNUP_RATE_LIMIT', 5),
  windowMs: fromEnv('FREE_TRIAL_SIGNUP_RATE_WINDOW_MS', 60_000),
}

const videoRateLimit = {
  maxPerWindow: fromEnv('FREE_TRIAL_VIDEO_RATE_LIMIT', 20),
  windowMs: fromEnv('FREE_TRIAL_VIDEO_RATE_WINDOW_MS', 60_000),
}

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(JSON.stringify(body))
}

const normalizeProviderFailure = (message, statusCode = 502, code = 'provider_failure') => ({
  ok: false,
  error: {
    code,
    message,
    userMessage: 'The configured AI provider request failed. Check the backend credentials and provider endpoint.',
    status: statusCode,
    retryable: true,
  },
})

const parseBody = async (req) => {
  if (req.method === 'GET') return {}
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (!chunks.length) return {}

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

const hashRequestKey = (value) => hashPrivacySignal(value) || 'anon'

const getRateLimitKey = (req, body = {}, type = 'video') => {
  const userId = typeof body.userId === 'string' ? body.userId : (typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : '')
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : (typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : '')
  const networkId = typeof body.networkId === 'string' ? body.networkId : (typeof req.headers['x-network-id'] === 'string' ? req.headers['x-network-id'] : '')
  const identifier = userId || deviceId || networkId || req.headers['x-forwarded-for'] || req.headers['user-agent'] || 'anonymous'
  return `${type}:${hashRequestKey(identifier)}`
}

const checkRateLimit = (req, body = {}, config, type) => {
  const key = getRateLimitKey(req, body, type)
  const now = Date.now()
  const bucket = rateLimitStore.get(key) ?? []
  const recent = bucket.filter((timestamp) => now - timestamp < config.windowMs)

  if (recent.length >= config.maxPerWindow) {
    return {
      allowed: false,
      retryAfterMs: config.windowMs - (now - recent[0]),
    }
  }

  recent.push(now)
  rateLimitStore.set(key, recent)
  return { allowed: true, retryAfterMs: 0 }
}

const getAuthenticatedUserId = (req, body = {}) => {
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
  if (bearerToken) {
    return bearerToken
  }

  const headerUserId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : ''
  if (headerUserId) {
    return headerUserId
  }

  const bodyUserId = typeof body.userId === 'string' ? body.userId : ''
  return bodyUserId || null
}

const enforceFreeTierEntitlement = async (req, body = {}) => {
  const userId = getAuthenticatedUserId(req, body)
  const requestedPlan = typeof body.plan === 'string' ? body.plan : 'free'
  const result = await entitlementService.consume({
    userId,
    authenticated: Boolean(userId),
    plan: requestedPlan,
    requestId: typeof body.requestId === 'string' ? body.requestId : `entitlement-${Date.now()}`,
    deviceId: typeof body.deviceId === 'string' ? body.deviceId : (typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : ''),
    networkId: typeof body.networkId === 'string' ? body.networkId : (typeof req.headers['x-network-id'] === 'string' ? req.headers['x-network-id'] : ''),
    accountDeleted: Boolean(body.accountDeleted),
  })

  if (!result.ok) {
    return {
      allowed: false,
      response: {
        ok: false,
        status: result.status,
        error: result.error,
        entitlement: {
          used: result.usage,
          remaining: result.remaining,
          limit: result.limit,
          upgradeRequired: result.upgradeRequired,
        },
      },
    }
  }

  return {
    allowed: true,
    response: {
      ok: true,
      status: result.status,
      entitlement: {
        used: result.usage,
        remaining: result.remaining,
        limit: result.limit,
        upgradeRequired: false,
      },
    },
  }
}

const getProviderConfig = () => {
  const configured = AI_PROVIDER !== 'none' && Boolean(AI_API_URL) && AI_MODEL !== 'not-configured'

  return {
    provider: configured ? AI_PROVIDER : 'none',
    apiUrl: AI_API_URL,
    model: AI_MODEL,
    configured,
  }
}

const callProvider = async (provider, apiUrl, model, prompt, action, context) => {
  if (provider === 'none' || !apiUrl || model === 'not-configured') {
    return {
      ok: false,
      error: {
        code: 'configuration_error',
        message: 'AI provider is not configured on the server.',
        userMessage: 'The AI provider has not been configured on the server-side boundary yet.',
        status: 503,
        retryable: false,
      },
    }
  }

  if (!AI_API_KEY) {
    return {
      ok: false,
      error: {
        code: 'authentication_error',
        message: 'Server-side AI provider API key is missing.',
        userMessage: 'The backend is missing the required AI provider credentials.',
        status: 401,
        retryable: false,
      },
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        action,
        context,
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Provider request failed.'
      return normalizeProviderFailure(message, response.status, 'provider_failure')
    }

    return {
      ok: true,
      data: {
        provider,
        model,
        message: payload?.message || 'AI request succeeded.',
        output: payload?.output ?? payload?.content ?? payload,
      },
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: {
          code: 'timeout_error',
          message: 'AI provider request timed out.',
          userMessage: 'The AI provider request timed out. The backend configuration may be unreachable or slow.',
          status: 504,
          retryable: true,
        },
      }
    }

    return normalizeProviderFailure(
      error instanceof Error ? error.message : 'Unknown provider failure.',
      502,
      'provider_failure',
    )
  } finally {
    clearTimeout(timeout)
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/api/ai/config') {
    sendJson(res, 200, getProviderConfig())
    return
  }

  if (url.pathname === '/api/auth/signup') {
    const body = await parseBody(req)
    const rateLimit = checkRateLimit(req, body, signupRateLimit, 'signup')

    if (!rateLimit.allowed) {
      sendJson(res, 429, {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Sign-up requests are temporarily rate limited.',
          userMessage: 'Too many sign-up attempts were made in a short period. Please wait and try again.',
          status: 429,
          retryable: true,
          retryAfterMs: rateLimit.retryAfterMs,
        },
      })
      return
    }

    sendJson(res, 200, {
      ok: true,
      data: { accepted: true, freeTrial: { limit: FREE_VIDEO_ALLOWANCE, remaining: FREE_VIDEO_ALLOWANCE } },
    })
    return
  }

  if (url.pathname === '/api/video/process' || url.pathname === '/api/ai/execute') {
    const body = await parseBody(req)
    const rateLimit = checkRateLimit(req, body, videoRateLimit, 'video-processing')

    if (!rateLimit.allowed) {
      sendJson(res, 429, {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Video-processing requests are temporarily rate limited.',
          userMessage: 'Too many processing requests were made in a short period. Please wait and try again.',
          status: 429,
          retryable: true,
          retryAfterMs: rateLimit.retryAfterMs,
        },
      })
      return
    }

    const provider = typeof body.provider === 'string' ? body.provider : AI_PROVIDER
    const apiUrl = typeof body.apiUrl === 'string' ? body.apiUrl : AI_API_URL
    const model = typeof body.model === 'string' ? body.model : AI_MODEL
    const prompt = typeof body.prompt === 'string' ? body.prompt : ''
    const action = typeof body.action === 'string' ? body.action : 'enhance'
    const context = body.context && typeof body.context === 'object' ? body.context : {}

    if (!prompt) {
      sendJson(res, 400, {
        ok: false,
        error: {
          code: 'validation_error',
          message: 'AI request prompt is required.',
          userMessage: 'A prompt is required to process the AI request.',
          status: 400,
          retryable: false,
        },
      })
      return
    }

    const entitlement = await enforceFreeTierEntitlement(req, body)
    if (!entitlement.allowed) {
      sendJson(res, entitlement.response.status, entitlement.response)
      return
    }

    const result = await callProvider(provider, apiUrl, model, prompt, action, context)

    if (!result.ok) {
      sendJson(res, result.error.status || 500, {
        ok: false,
        error: result.error,
      })
      return
    }

    sendJson(res, 200, {
      ok: true,
      data: result.data,
      entitlement: entitlement.response.entitlement,
    })
    return
  }

  sendJson(res, 404, {
    ok: false,
    error: {
      code: 'not_found',
      message: 'Route not found.',
      userMessage: 'The requested backend route was not found.',
      status: 404,
      retryable: false,
    },
  })
})

server.listen(PORT, () => {
  console.log(`AI backend running on http://localhost:${PORT}`)
})
