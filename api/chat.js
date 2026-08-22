const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Access-Control-Allow-Origin', '*').setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization').setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS').json(body)
}

const extractText = (payload) => payload?.output_text || payload?.output?.[0]?.content?.[0]?.text || payload?.choices?.[0]?.message?.content || payload?.content?.[0]?.text || payload?.message || payload?.output || payload?.content || ''

async function providerRequest(prompt) {
  const provider = process.env.AI_PROVIDER || 'openai'
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || ''
  if (!apiKey) throw new Error('AI credentials are not configured on the server.')

  let url = process.env.AI_API_URL
  let body
  let headers = { 'Content-Type': 'application/json' }

  if (provider === 'gemini') {
    url = url || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    body = { contents: [{ parts: [{ text: prompt }] }] }
  } else if (provider === 'anthropic') {
    url = url || 'https://api.anthropic.com/v1/messages'
    headers = { ...headers, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    body = { model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }
  } else {
    url = url || 'https://api.openai.com/v1/responses'
    headers.Authorization = `Bearer ${apiKey}`
    body = { model, input: prompt }
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || 'The AI provider request failed.')
  return extractText(payload)
}

const parseIntent = (text) => {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const value = JSON.parse(match[0])
    if (!['conversation', 'image_generation', 'video_edit', 'clarification'].includes(value.intent)) return null
    return { intent: value.intent, confidence: Number(value.confidence) || 0 }
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: { userMessage: 'Only POST is supported.' } })

  try {
    const { message, conversation } = req.body || {}
    if (typeof message !== 'string' || !message.trim()) return json(res, 400, { error: { userMessage: 'A message is required.' } })

    const history = Array.isArray(conversation) ? conversation.slice(-12).map((item) => `${item.role}: ${String(item.text || '').slice(0, 2000)}`).join('\n') : ''
    const intentText = await providerRequest(`You are Pilgrix's intent router. Understand the user's meaning and DO NOT generate media yourself. Classify exactly one intent: conversation, image_generation, video_edit, clarification. A normal question, explanation, brainstorming, greeting, planning, or discussion is conversation. Choose image_generation only when the user explicitly asks to create/generate an image. Choose video_edit only when the user explicitly asks to create, generate, edit, render, transform, or make a video/reel/clip from media. Do not infer video intent merely because video is mentioned. Choose clarification when the requested action is genuinely ambiguous. Return ONLY JSON: {"intent":"...","confidence":0.0}.\nConversation:\n${history}\nUser: ${message.trim()}`)
    const parsed = parseIntent(intentText) || { intent: 'conversation', confidence: 0.5 }

    const responseText = await providerRequest(`You are Pilgrix, a capable friendly AI assistant. Respond naturally to the user. Do not claim to have generated an image or video unless a separate generation tool actually did it. Do not start a video or image workflow merely because media is mentioned. If intent is video_edit or image_generation, acknowledge the request and explain the next action briefly; the client will route it to the correct tool. If intent is clarification, ask one concise question. Otherwise answer normally.\nIntent: ${parsed.intent}\nRecent conversation:\n${history}\nUser: ${message.trim()}`)

    return json(res, 200, { intent: parsed.intent, confidence: parsed.confidence, message: responseText || 'I am ready to help.' })
  } catch (error) {
    return json(res, 503, { error: { code: 'ai_unavailable', userMessage: error instanceof Error ? error.message : 'AI is temporarily unavailable.', retryable: true } })
  }
}
