import { createFeedbackEvent } from './feedback-intelligence.mjs'

export function createFeedbackApi({ store }) {
  return async function handleFeedbackApi({ req, res, url, authenticate, sendJson }) {
    if (url.pathname === '/api/feedback' && req.method === 'POST') {
      const auth = await authenticate(req)
      if (!auth.ok) { sendJson(res, auth.status, { ok: false, error: auth.error }); return true }
      const chunks = []
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      let body = {}
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {} } catch { sendJson(res, 400, { ok: false, error: { code: 'validation_error', userMessage: 'Invalid feedback payload.', status: 400, retryable: false } }); return true }
      try {
        const event = createFeedbackEvent({ userId: auth.userId, jobId: body.jobId, type: body.type, reason: body.reason ?? null, note: body.note ?? '', consentToImprove: body.consentToImprove === true, metadata: body.metadata ?? {} })
        await store.save(event)
        sendJson(res, 201, { ok: true, feedbackId: event.id })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: { code: 'feedback_validation_error', userMessage: error.message || 'We could not save your feedback.', status: 400, retryable: false } })
      }
      return true
    }

    if (url.pathname === '/api/feedback/my' && req.method === 'GET') {
      const auth = await authenticate(req)
      if (!auth.ok) { sendJson(res, auth.status, { ok: false, error: auth.error }); return true }
      sendJson(res, 200, { ok: true, feedback: await store.listByUser(auth.userId) })
      return true
    }
    return false
  }
}
