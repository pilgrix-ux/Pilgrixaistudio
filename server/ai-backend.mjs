import http from 'node:http'
import { createFreeTierEntitlementService, FREE_VIDEO_ALLOWANCE, hashPrivacySignal } from './entitlement.mjs'
import { getBearerToken, verifySupabaseAccessToken } from './auth.mjs'
import { createSecurityGate } from './security-gate.mjs'
import { createSmsProvider } from './sms-provider.mjs'

const PORT = Number(process.env.AI_BACKEND_PORT || 3001)
const AI_PROVIDER = process.env.AI_PROVIDER || 'none'
const AI_API_URL = process.env.AI_API_URL || ''
const AI_MODEL = process.env.AI_MODEL || 'not-configured'
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000)
const rateLimitStore = new Map()
const entitlementService = createFreeTierEntitlementService({ freeVideoAllowance: Number.parseInt(process.env.FREE_VIDEO_ALLOWANCE || String(FREE_VIDEO_ALLOWANCE), 10) })
const securityGate = createSecurityGate({ sendSms: async ({ phoneNumber, message }) => { if (!process.env.INFOBIP_API_KEY) throw new Error('INFOBIP_API_KEY is not configured'); return createSmsProvider().sendSms({ phoneNumber, message }) } })
const fromEnv = (name, fallback) => { const value = Number.parseInt(process.env[name] || String(fallback), 10); return Number.isFinite(value) ? value : fallback }
const signupRateLimit = { maxPerWindow: fromEnv('FREE_TRIAL_SIGNUP_RATE_LIMIT', 5), windowMs: fromEnv('FREE_TRIAL_SIGNUP_RATE_WINDOW_MS', 60_000) }
const videoRateLimit = { maxPerWindow: fromEnv('FREE_TRIAL_VIDEO_RATE_LIMIT', 20), windowMs: fromEnv('FREE_TRIAL_VIDEO_RATE_WINDOW_MS', 60_000) }
const sendJson = (res, statusCode, body) => { res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Device-Id,X-Network-Id' }); res.end(JSON.stringify(body)) }
const parseBody = async (req) => { if (req.method === 'GET') return {}; const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); if (!chunks.length) return {}; try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} } }
const getRateLimitKey = (req, auth, type) => `${type}:${hashPrivacySignal(auth?.userId || req.headers['x-forwarded-for'] || req.headers['user-agent'] || 'anonymous') || 'anon'}`
const checkRateLimit = (req, auth, config, type) => { const key = getRateLimitKey(req, auth, type); const now = Date.now(); const bucket = rateLimitStore.get(key) ?? []; const recent = bucket.filter((timestamp) => now - timestamp < config.windowMs); if (recent.length >= config.maxPerWindow) return { allowed: false, retryAfterMs: config.windowMs - (now - recent[0]) }; recent.push(now); rateLimitStore.set(key, recent); return { allowed: true, retryAfterMs: 0 } }
const authenticate = async (req) => { const token = getBearerToken(req); if (!token) return { ok: false, status: 401, error: { code: 'authentication_error', message: 'A valid Supabase access token is required.', userMessage: 'Please sign in to continue.', status: 401, retryable: false } }; const result = await verifySupabaseAccessToken(token); return result.ok ? result : { ok: false, status: result.status, error: { code: result.code, message: result.message, userMessage: 'Your session could not be verified. Please sign in again.', status: result.status, retryable: false } } }
const getPlanFromClaims = (claims) => { const plan = claims?.app_metadata?.plan; return ['free', 'starter', 'growth', 'pro'].includes(plan) ? plan : 'free' }
const getIdentity = (req, auth, body = {}) => ({ userId: auth.userId, deviceId: typeof body.deviceId === 'string' ? body.deviceId : String(req.headers['x-device-id'] || ''), networkId: typeof body.networkId === 'string' ? body.networkId : String(req.headers['x-network-id'] || ''), phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '', email: typeof auth.claims?.email === 'string' ? auth.claims.email : '' })
const entitlementView = (result) => ({ used: result.usage, remaining: result.remaining, limit: result.limit, upgradeRequired: Boolean(result.upgradeRequired) })
const authorizeEntitlement = (auth, identity) => entitlementService.authorize({ userId: auth.userId, authenticated: true, plan: getPlanFromClaims(auth.claims), deviceId: identity.deviceId, networkId: identity.networkId, phoneNumber: identity.phoneNumber, email: identity.email })
const consumeEntitlement = async (auth, body, identity) => entitlementService.consume({ userId: auth.userId, authenticated: true, plan: getPlanFromClaims(auth.claims), requestId: typeof body.requestId === 'string' ? body.requestId : undefined, deviceId: identity.deviceId, networkId: identity.networkId, phoneNumber: identity.phoneNumber, email: identity.email })
const getProviderConfig = () => ({ provider: AI_PROVIDER !== 'none' && AI_API_URL && AI_MODEL !== 'not-configured' ? AI_PROVIDER : 'none', apiUrl: AI_API_URL, model: AI_MODEL, configured: AI_PROVIDER !== 'none' && Boolean(AI_API_URL) && AI_MODEL !== 'not-configured' })
const callProvider = async (prompt, action, context) => { if (AI_PROVIDER === 'none' || !AI_API_URL || AI_MODEL === 'not-configured') return { ok: false, error: { code: 'configuration_error', userMessage: 'The AI provider has not been configured on the server yet.', status: 503, retryable: false } }; if (!AI_API_KEY) return { ok: false, error: { code: 'authentication_error', userMessage: 'The backend is missing the required AI provider credentials.', status: 401, retryable: false } }; const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS); try { const response = await fetch(AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` }, body: JSON.stringify({ model: AI_MODEL, input: prompt, action, context }), signal: controller.signal }); const payload = await response.json().catch(() => ({})); if (!response.ok) return { ok: false, error: { code: 'provider_failure', userMessage: 'The AI request failed. Please try again.', status: response.status, retryable: true } }; return { ok: true, data: { provider: AI_PROVIDER, model: AI_MODEL, message: payload?.message || 'AI request succeeded.', output: payload?.output ?? payload?.content ?? payload } } } catch (error) { return { ok: false, error: { code: error?.name === 'AbortError' ? 'timeout_error' : 'provider_failure', userMessage: error?.name === 'AbortError' ? 'The AI request took too long. Please try again.' : 'The AI request failed. Please try again.', status: error?.name === 'AbortError' ? 504 : 502, retryable: true } } } finally { clearTimeout(timeout) } }

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/api/ai/config' && req.method === 'GET') return sendJson(res, 200, getProviderConfig())
  if (url.pathname === '/api/auth/signup') { const rate = checkRateLimit(req, null, signupRateLimit, 'signup'); if (!rate.allowed) return sendJson(res, 429, { ok: false, error: { code: 'rate_limited', userMessage: 'Too many sign-up attempts were made. Please wait and try again.', status: 429, retryable: true, retryAfterMs: rate.retryAfterMs } }); return sendJson(res, 200, { ok: true, data: { accepted: true, freeTrial: { limit: FREE_VIDEO_ALLOWANCE, remaining: FREE_VIDEO_ALLOWANCE } } }) }
  const protectedRoute = ['/api/security/otp/request', '/api/security/otp/verify', '/api/video/process', '/api/ai/execute'].includes(url.pathname)
  if (!protectedRoute) return sendJson(res, 404, { ok: false, error: { code: 'not_found', userMessage: 'The requested backend route was not found.', status: 404, retryable: false } })
  const body = await parseBody(req)
  const auth = await authenticate(req); if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error })
  const identity = getIdentity(req, auth, body)
  if (url.pathname === '/api/security/otp/request') { if (!identity.phoneNumber) return sendJson(res, 400, { ok: false, error: { code: 'validation_error', userMessage: 'A valid phone number is required.', status: 400, retryable: false } }); const result = await securityGate.beginOtpChallenge({ userId: auth.userId, phoneNumber: identity.phoneNumber }); return sendJson(res, result.status || 400, result.ok ? { ok: true, expiresAt: result.expiresAt } : { ok: false, error: result.error }) }
  if (url.pathname === '/api/security/otp/verify') { const code = typeof body.code === 'string' ? body.code.trim() : ''; const result = securityGate.verifyOtpChallenge({ userId: auth.userId, code }); if (!result.ok) { securityGate.markOtpFailure({ userId: auth.userId }); return sendJson(res, result.status || 401, { ok: false, error: result.error }) }; securityGate.markOtpVerified({ userId: auth.userId }); return sendJson(res, 200, { ok: true, verified: true }) }
  const rate = checkRateLimit(req, auth, videoRateLimit, 'video-processing'); if (!rate.allowed) return sendJson(res, 429, { ok: false, error: { code: 'rate_limited', userMessage: 'Too many processing requests were made. Please wait and try again.', status: 429, retryable: true, retryAfterMs: rate.retryAfterMs } })
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''; if (!prompt) return sendJson(res, 400, { ok: false, error: { code: 'validation_error', userMessage: 'A prompt is required to process the AI request.', status: 400, retryable: false } })
  const security = securityGate.authorizeVideo({ ...identity, authenticated: true, plan: getPlanFromClaims(auth.claims) })
  if (!security.ok) return sendJson(res, security.status, { ok: false, error: { code: security.action === 'verify_phone' ? 'phone_verification_required' : security.action === 'upgrade' ? 'entitlement_limit_exceeded' : 'security_blocked', userMessage: security.action === 'verify_phone' ? 'Please verify your phone number before continuing.' : security.action === 'upgrade' ? 'Your free trial has ended. Upgrade to keep creating.' : 'We could not approve this request. Please try again later.', status: security.status, retryable: false } })
  const entitlementAuth = authorizeEntitlement(auth, identity)
  if (!entitlementAuth.ok) return sendJson(res, entitlementAuth.status, { ok: false, error: entitlementAuth.error, entitlement: entitlementView(entitlementAuth) })
  securityGate.rememberIdentity(identity)
  const result = await callProvider(prompt, typeof body.action === 'string' ? body.action : 'enhance', body.context && typeof body.context === 'object' ? body.context : {})
  if (!result.ok) return sendJson(res, result.error.status || 500, { ok: false, error: result.error })
  const consumed = await consumeEntitlement(auth, body, identity)
  if (!consumed.ok) return sendJson(res, consumed.status, { ok: false, error: consumed.error, entitlement: entitlementView(consumed) })
  return sendJson(res, 200, { ok: true, data: result.data, entitlement: entitlementView(consumed) })
})
server.listen(PORT, () => console.log(`AI backend running on http://localhost:${PORT}`))
