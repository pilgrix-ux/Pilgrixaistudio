const normalizeBaseUrl = (value) => String(value || 'https://api.infobip.com').replace(/\/$/, '')

export const createSmsProvider = ({
  apiKey = process.env.INFOBIP_API_KEY,
  baseUrl = process.env.INFOBIP_BASE_URL,
  sender = process.env.INFOBIP_SENDER || 'ServiceSMS',
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (!apiKey) throw new Error('INFOBIP_API_KEY is not configured')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required')

  return {
    async sendSms({ phoneNumber, message }) {
      if (!phoneNumber || !message) throw new Error('phoneNumber and message are required')

      const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/sms/3/messages`, {
        method: 'POST',
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            sender,
            destinations: [{ to: String(phoneNumber) }],
            content: { text: String(message) },
          }],
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`SMS provider rejected the message (${response.status})${body ? `: ${body.slice(0, 300)}` : ''}`)
      }

      return { ok: true }
    },
  }
}
