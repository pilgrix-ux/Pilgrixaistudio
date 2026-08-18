import crypto from 'node:crypto'

const JOB_STATES = ['queued', 'analyzing', 'checking', 'planning', 'processing', 'rendering', 'completed', 'failed']
const CAPABILITY_STATES = ['available', 'partial', 'missing', 'generatable', 'impossible']

export const createJobId = () => crypto.randomUUID()

export function createEditJob({ userId, instruction, sourceMedia = [], referenceMedia = [] }) {
  if (!userId) throw new Error('userId is required')
  if (!instruction?.trim()) throw new Error('instruction is required')
  return {
    id: createJobId(),
    userId,
    instruction: instruction.trim(),
    sourceMedia,
    referenceMedia,
    state: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analysis: null,
    capabilityReport: null,
    editPlan: null,
    output: null,
    error: null,
  }
}

export function transitionJob(job, state, progress) {
  if (!JOB_STATES.includes(state)) throw new Error(`Invalid job state: ${state}`)
  if (progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100')
  return { ...job, state, progress, updatedAt: new Date().toISOString() }
}

export function createAnalysis({ durationMs, shots = [], scenes = [], speech = [], beats = [], objects = [], actions = [], motion = [], ocr = [], audio = [], metadata = {} }) {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('durationMs must be a non-negative number')
  const timestamped = (items) => items.map((item) => ({ ...item, startMs: Math.max(0, Number(item.startMs || 0)), endMs: Math.max(0, Number(item.endMs || item.startMs || 0)) }))
  return {
    durationMs,
    precision: 'millisecond',
    shots: timestamped(shots),
    scenes: timestamped(scenes),
    speech: timestamped(speech),
    beats: timestamped(beats),
    objects: timestamped(objects),
    actions: timestamped(actions),
    motion: timestamped(motion),
    ocr: timestamped(ocr),
    audio: timestamped(audio),
    metadata,
  }
}

export function compareReferenceToSource({ referenceSegments = [], sourceAnalysis }) {
  if (!sourceAnalysis) throw new Error('sourceAnalysis is required')
  return referenceSegments.map((reference) => {
    const candidates = sourceAnalysis.shots
      .map((shot) => ({ shot, score: similarityScore(reference, shot) }))
      .sort((a, b) => b.score - a.score)
    const best = candidates[0]
    const score = best?.score ?? 0
    let status = 'missing'
    if (score >= 0.85) status = 'available'
    else if (score >= 0.6) status = 'partial'
    else if (reference.generatable) status = 'generatable'
    else if (score > 0.2) status = 'missing'
    else status = 'impossible'
    return {
      referenceId: reference.id,
      startMs: reference.startMs,
      endMs: reference.endMs,
      status,
      score,
      sourceShotId: best?.shot?.id ?? null,
      reason: reasonFor(status, reference, best?.shot),
    }
  })
}

export function buildEditPlan({ instruction, sourceAnalysis, referenceAnalysis = null, capabilityReport = [] }) {
  return {
    version: 1,
    precision: 'millisecond',
    instruction,
    source: sourceAnalysis,
    reference: referenceAnalysis,
    capabilityReport,
    operations: [],
    policy: {
      neverInventMissingFootage: true,
      preserveUnsupportedReferenceSections: false,
      requireCapabilityCheckBeforeRender: true,
    },
  }
}

function similarityScore(a, b) {
  const features = ['action', 'composition', 'cameraMotion', 'subject', 'shotType']
  let total = 0
  let weight = 0
  for (const feature of features) {
    if (a[feature] == null) continue
    weight += 1
    if (a[feature] === b?.[feature]) total += 1
  }
  const timing = Math.max(1, Number(a.endMs || 0) - Number(a.startMs || 0))
  const candidateTiming = Math.max(1, Number(b?.endMs || 0) - Number(b?.startMs || 0))
  const durationScore = Math.min(timing, candidateTiming) / Math.max(timing, candidateTiming)
  return Math.min(1, ((weight ? total / weight : 0) * 0.8) + (durationScore * 0.2))
}

function reasonFor(status, reference, source) {
  if (status === 'available') return 'A strong matching source segment was found.'
  if (status === 'partial') return 'A usable approximation was found, but some reference characteristics differ.'
  if (status === 'generatable') return 'The requested visual treatment may be generated without inventing source footage.'
  if (status === 'impossible') return 'No source material or permitted generation path can satisfy this section.'
  return `No sufficiently matching source segment was found${reference.action ? ` for action: ${reference.action}` : ''}${source ? '.' : '.'}`
}

export { CAPABILITY_STATES, JOB_STATES }
