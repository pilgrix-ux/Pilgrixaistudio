import crypto from 'node:crypto'

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL || (SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` : '')
const SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER || (SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : '')
const SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated'
const JWKS_CACHE_MS = 5 * 60 * 1000
let jwksCache = { expiresAt: 0, keys: [] }

const base64urlDecode = (value) => {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='), 'base64')
}
const decodeJson = (value) => JSON.parse(base64urlDecode(value).toString('utf8'))
const timingSafeEqual = (left, right) => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b) }
const derInteger = (value) => { let integer = Buffer.from(value); while (integer.length > 1 && integer[0] === 0) integer = integer.subarray(1); if (integer[0] & 0x80) integer = Buffer.concat([Buffer.from([0]), integer]); return Buffer.concat([Buffer.from([0x02, integer.length]), integer]) }
const joseEcdsaToDer = (signature) => { if (signature.length !== 64) throw new Error('Invalid ES256 signature length'); const r = derInteger(signature.subarray(0, 32)); const s = derInteger(signature.subarray(32, 64)); const seq = Buffer.concat([r, s]); return Buffer.concat([Buffer.from([0x30, seq.length]), seq]) }

const getJwks = async () => {
  if (!SUPABASE_JWKS_URL) throw new Error('Supabase JWKS URL is not configured')
  if (jwksCache.expiresAt > Date.now() && jwksCache.keys.length) return jwksCache.keys
  const response = await fetch(SUPABASE_JWKS_URL, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`Supabase JWKS request failed with ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload?.keys) || payload.keys.length === 0) throw new Error('Supabase JWKS contains no keys')
  jwksCache = { expiresAt: Date.now() + JWKS_CACHE_MS, keys: payload.keys }
  return jwksCache.keys
}

const verifySignature = async ({ signingInput, signature, header }) => {
  if (header.alg === 'HS256') {
    if (!SUPABASE_JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET is not configured')
    const expected = crypto.createHmac('sha256', SUPABASE_JWT_SECRET).update(signingInput).digest()
    return timingSafeEqual(expected, signature)
  }
  if (!['RS256', 'ES256'].includes(header.alg)) throw new Error(`Unsupported JWT algorithm: ${header.alg}`)
  const keys = await getJwks()
  const jwk = keys.find((key) => key.kid === header.kid && key.alg === header.alg) || keys.find((key) => key.kid === header.kid)
  if (!jwk) throw new Error('No matching Supabase signing key')
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const verifier = crypto.createVerify('SHA256'); verifier.update(signingInput); verifier.end()
  return verifier.verify(publicKey, header.alg === 'ES256' ? joseEcdsaToDer(signature) : signature)
}

export const verifySupabaseAccessToken = async (token) => {
  if (!token || typeof token !== 'string') return { ok: false, status: 401, code: 'authentication_error', message: 'Missing access token.' }
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, status: 401, code: 'authentication_error', message: 'Malformed access token.' }
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const header = decodeJson(encodedHeader); const payload = decodeJson(encodedPayload); const signature = base64urlDecode(encodedSignature)
    if (!header?.alg || header.alg === 'none' || !payload?.sub) throw new Error('Invalid JWT header or subject')
    if (!(await verifySignature({ signingInput: `${encodedHeader}.${encodedPayload}`, signature, header }))) throw new Error('Invalid JWT signature')
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('JWT expired')
    if (typeof payload.nbf === 'number' && payload.nbf > now) throw new Error('JWT not active yet')
    if (SUPABASE_JWT_ISSUER && payload.iss !== SUPABASE_JWT_ISSUER) throw new Error('Invalid JWT issuer')
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!audience.includes(SUPABASE_JWT_AUDIENCE)) throw new Error('Invalid JWT audience')
    return { ok: true, userId: String(payload.sub), claims: payload }
  } catch (error) {
    return { ok: false, status: 401, code: 'authentication_error', message: error instanceof Error ? error.message : 'Access token verification failed.' }
  }
}

export const getBearerToken = (req) => {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null
}
