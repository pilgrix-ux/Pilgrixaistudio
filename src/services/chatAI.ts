export type ChatIntent = 'conversation' | 'image_generation' | 'video_edit' | 'clarification'

export interface ChatAIResult {
  intent: ChatIntent
  message: string
  confidence: number
}

export async function sendChatToAI(input: {
  message: string
  conversation?: Array<{ role: 'user' | 'assistant'; text: string }>
}): Promise<ChatAIResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.userMessage || 'The AI could not respond right now.')
  }

  return {
    intent: payload.intent || 'conversation',
    message: payload.message || 'I could not generate a response.',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
  }
}
