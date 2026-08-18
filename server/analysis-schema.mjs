const TIMELINE_FIELDS = ['shots', 'scenes', 'speech', 'beats', 'objects', 'actions', 'motion', 'ocr', 'audio']

export function normalizeTimeline(items = [], durationMs = Infinity) {
  return items.map((item, index) => {
    const startMs = Number(item.startMs)
    const endMs = Number(item.endMs)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) throw new Error(`Invalid timestamp at index ${index}`)
    if (startMs < 0 || endMs < startMs || endMs > durationMs) throw new Error(`Invalid timeline range at index ${index}`)
    return { ...item, startMs, endMs }
  })
}

export function validateVideoAnalysis(analysis) {
  if (!analysis || !Number.isFinite(analysis.durationMs) || analysis.durationMs < 0) throw new Error('Invalid video analysis duration')
  for (const field of TIMELINE_FIELDS) {
    if (!Array.isArray(analysis[field])) throw new Error(`Analysis field ${field} must be an array`)
    analysis[field] = normalizeTimeline(analysis[field], analysis.durationMs)
  }
  return analysis
}

export function mergeAnalysis(parts) {
  const merged = { durationMs: 0, precision: 'millisecond', metadata: {} }
  for (const part of parts.filter(Boolean)) {
    validateVideoAnalysis(part)
    merged.durationMs = Math.max(merged.durationMs, part.durationMs)
    merged.metadata = { ...merged.metadata, ...part.metadata }
    for (const field of TIMELINE_FIELDS) merged[field] = [...(merged[field] || []), ...part[field]]
  }
  for (const field of TIMELINE_FIELDS) merged[field] = (merged[field] || []).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  return validateVideoAnalysis(merged)
}

export { TIMELINE_FIELDS }
