const FEEDBACK_TYPES = new Set(['positive', 'negative'])
const FEEDBACK_REASONS = new Set([
  'wrong_clip', 'bad_timing', 'bad_transition', 'misunderstood',
  'reference_mismatch', 'audio_music', 'quality', 'missing_something',
  'too_slow', 'other',
])

export function createFeedbackEvent({ userId, jobId, type, reason = null, note = '', consentToImprove = false, metadata = {} }) {
  if (!userId || !jobId) throw new Error('userId and jobId are required')
  if (!FEEDBACK_TYPES.has(type)) throw new Error('Invalid feedback type')
  if (reason !== null && !FEEDBACK_REASONS.has(reason)) throw new Error('Invalid feedback reason')
  return {
    id: crypto.randomUUID(),
    userId,
    jobId,
    type,
    reason,
    note: String(note).trim().slice(0, 2000),
    consentToImprove: Boolean(consentToImprove),
    metadata: sanitizeMetadata(metadata),
    createdAt: new Date().toISOString(),
  }
}

export function summarizeFeedback(events) {
  const valid = events.filter(Boolean)
  const positive = valid.filter((event) => event.type === 'positive').length
  const negative = valid.filter((event) => event.type === 'negative').length
  const reasons = {}
  for (const event of valid) if (event.reason) reasons[event.reason] = (reasons[event.reason] || 0) + 1
  return {
    total: valid.length,
    positive,
    negative,
    acceptanceRate: valid.length ? positive / valid.length : null,
    topProblems: Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, count })),
  }
}

export function deriveQualitySignals({ feedback = [], regenerateCount = 0, accepted = false, renderMs = null, capability = null }) {
  const summary = summarizeFeedback(feedback)
  const signals = []
  if (summary.negative > summary.positive) signals.push('user_rejection')
  if (regenerateCount >= 2) signals.push('repeated_regeneration')
  if (accepted) signals.push('accepted_without_negative_feedback')
  if (Number.isFinite(renderMs) && renderMs > 0) signals.push(renderMs > 180000 ? 'slow_render' : 'normal_render')
  if (capability?.some?.((item) => ['missing', 'impossible'].includes(item.status))) signals.push('source_capability_gap')
  return { ...summary, regenerateCount, signals }
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const allowed = ['feature', 'plan', 'platform', 'appVersion', 'editType']
  return Object.fromEntries(allowed.filter((key) => typeof metadata[key] === 'string').map((key) => [key, metadata[key].slice(0, 100)]))
}

export { FEEDBACK_REASONS, FEEDBACK_TYPES }
