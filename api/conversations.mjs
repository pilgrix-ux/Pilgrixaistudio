import { getBearerToken, verifySupabaseAccessToken } from '../server/auth.mjs'

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REST_URL = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''

const headers = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
})

const send = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const bodyOf = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} }
}

const supabase = async (table, options = {}) => {
  if (!REST_URL || !SUPABASE_KEY) throw new Error('Supabase server persistence is not configured.')
  const query = options.query ? `?${options.query}` : ''
  const response = await fetch(`${REST_URL}/${table}${query}`, {
    method: options.method || 'GET',
    headers: { ...headers(), ...(options.prefer ? { Prefer: options.prefer } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase request failed with ${response.status}`)
  return data
}

const auth = async (req) => {
  const token = getBearerToken(req)
  if (!token) return { ok: false, status: 401, message: 'Sign in to save conversations.' }
  const result = await verifySupabaseAccessToken(token)
  return result.ok ? result : { ok: false, status: result.status, message: 'Your session could not be verified.' }
}

const cleanText = (value, max = 20000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const safeId = (value) => cleanText(value, 180).replace(/[^a-zA-Z0-9._:-]/g, '_')

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  const session = await auth(req)
  if (!session.ok) return send(res, session.status, { ok: false, error: { code: 'authentication_error', message: session.message } })

  try {
    if (req.method === 'GET') {
      const conversations = await supabase('conversations', {
        query: `select=id,title,preview,attachment_count,created_at,updated_at&user_id=eq.${encodeURIComponent(session.userId)}&order=updated_at.desc&limit=100`,
      })
      const messages = await supabase('conversation_messages', {
        query: `select=id,conversation_id,role,text,created_at&user_id=eq.${encodeURIComponent(session.userId)}&order=created_at.asc&limit=10000`,
      })
      const images = await supabase('image_creations', {
        query: `select=id,conversation_id,prompt,image_url,metadata,created_at&user_id=eq.${encodeURIComponent(session.userId)}&order=created_at.desc&limit=500`,
      })
      return send(res, 200, { ok: true, conversations, messages, images })
    }

    const body = await bodyOf(req)

    if (req.method === 'DELETE') {
      const id = safeId(body.id)
      if (!id) return send(res, 400, { ok: false, error: { code: 'validation_error', message: 'Conversation id is required.' } })
      await supabase('conversations', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.userId)}` })
      return send(res, 200, { ok: true })
    }

    if (req.method !== 'POST') return send(res, 405, { ok: false, error: { code: 'method_not_allowed', message: 'Method not allowed.' } })

    if (body.action === 'save_image') {
      const id = safeId(body.id) || `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const conversationId = safeId(body.conversationId)
      const row = {
        id,
        user_id: session.userId,
        conversation_id: conversationId || null,
        prompt: cleanText(body.prompt, 10000),
        image_url: cleanText(body.imageUrl, 4000),
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
        created_at: body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString(),
      }
      const data = await supabase('image_creations', { method: 'POST', query: 'on_conflict=id,user_id', prefer: 'resolution=merge-duplicates,return=representation', body: [row] })
      return send(res, 200, { ok: true, image: data?.[0] || row })
    }

    const conversation = body.conversation && typeof body.conversation === 'object' ? body.conversation : body
    const id = safeId(conversation.id)
    if (!id) return send(res, 400, { ok: false, error: { code: 'validation_error', message: 'Conversation id is required.' } })

    const now = new Date().toISOString()
    const conversationRow = {
      id,
      user_id: session.userId,
      title: cleanText(conversation.title, 120) || 'New conversation',
      preview: cleanText(conversation.preview, 20000),
      attachment_count: Number.isFinite(Number(conversation.attachmentCount)) ? Number(conversation.attachmentCount) : 0,
      created_at: conversation.createdAt ? new Date(conversation.createdAt).toISOString() : now,
      updated_at: now,
    }

    await supabase('conversations', { method: 'POST', query: 'on_conflict=id,user_id', prefer: 'resolution=merge-duplicates', body: [conversationRow] })

    const messages = Array.isArray(conversation.messages) ? conversation.messages : []
    if (messages.length) {
      const messageRows = messages.map((message, index) => ({
        id: safeId(message.id) || `message-${id}-${index}`,
        conversation_id: id,
        user_id: session.userId,
        role: message.role === 'assistant' ? 'assistant' : 'user',
        text: cleanText(message.text, 20000),
        created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date(conversation.createdAt || now).toISOString(),
      }))
      await supabase('conversation_messages', { method: 'POST', query: 'on_conflict=id,user_id', prefer: 'resolution=merge-duplicates', body: messageRows })
    }

    return send(res, 200, { ok: true, savedAt: now })
  } catch (error) {
    console.error('conversation persistence error', error)
    return send(res, 503, { ok: false, error: { code: 'persistence_unavailable', message: 'Conversation saved locally. Server sync will retry automatically.' } })
  }
}
