import { createEditJobStore } from './edit-job-store.mjs'
import { createPersistentEditJobStore, isPersistentEditJobStoreConfigured } from './persistent-edit-job-store.mjs'
import { buildEditPlan, compareReferenceToSource, createAnalysis } from './edit-engine.mjs'
import { validateEditPlan } from './edit-plan-validator.mjs'

const store = isPersistentEditJobStoreConfigured() ? createPersistentEditJobStore() : createEditJobStore()
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }

export async function handleEditApi({ req, res, url, authenticate, authorizeEntitlement, consumeEntitlement, checkRateLimit, videoRateLimit, callProvider, renderVideo }) {
  if (!url.pathname.startsWith('/api/edit-jobs')) return false
  const auth = await authenticate(req)
  if (!auth.ok) { json(res, auth.status, { ok: false, error: auth.error }); return true }
  const segments = url.pathname.split('/').filter(Boolean); const jobId = segments[2]
  if (req.method === 'POST' && !jobId) {
    const rate = checkRateLimit(req, auth, videoRateLimit, 'edit-job')
    if (!rate.allowed) { json(res, 429, { ok: false, error: { code: 'rate_limited', userMessage: 'Too many edit requests were made. Please wait and try again.', status: 429, retryable: true, retryAfterMs: rate.retryAfterMs } }); return true }
    const body = await readJson(req); const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) { json(res, 400, { ok: false, error: { code: 'validation_error', userMessage: 'Tell Pilgrix what you want to make.', status: 400, retryable: false } }); return true }
    const entitlement = await authorizeEntitlement(auth)
    if (!entitlement.ok) { json(res, entitlement.status, { ok: false, error: entitlement.error }); return true }
    const job = await store.create({ userId: auth.userId, instruction: prompt, sourceMedia: Array.isArray(body.sourceMedia) ? body.sourceMedia : [], referenceMedia: Array.isArray(body.referenceMedia) ? body.referenceMedia : [] })
    void processJob(job, { body, auth, callProvider, consumeEntitlement, renderVideo }).catch(() => {})
    json(res, 202, { ok: true, job: publicJob(job) }); return true
  }
  if (req.method === 'GET' && jobId) {
    const job = await store.get(jobId)
    if (!job || job.userId !== auth.userId) { json(res, 404, { ok: false, error: { code: 'not_found', userMessage: 'Edit job not found.', status: 404, retryable: false } }); return true }
    json(res, 200, { ok: true, job: publicJob(job) }); return true
  }
  json(res, 405, { ok: false, error: { code: 'method_not_allowed', userMessage: 'This edit operation is not supported.', status: 405, retryable: false } }); return true
}

async function processJob(job, { body, auth, callProvider, consumeEntitlement, renderVideo }) {
  try {
    await store.transition(job.id, 'analyzing', 10)
    const sourceAnalysis = body.sourceAnalysis ? normalizeAnalysis(body.sourceAnalysis) : createAnalysis({ durationMs: Number(body.durationMs || 0) })
    const referenceAnalysis = body.referenceAnalysis ? normalizeAnalysis(body.referenceAnalysis) : null
    await store.save({ ...(await store.get(job.id)), analysis: { source: sourceAnalysis, reference: referenceAnalysis } })
    await store.transition(job.id, 'checking', 30)
    const capabilityReport = referenceAnalysis ? compareReferenceToSource({ referenceSegments: referenceAnalysis.shots || [], sourceAnalysis }) : []
    await store.save({ ...(await store.get(job.id)), capabilityReport })
    if (capabilityReport.some((item) => item.status === 'impossible')) throw Object.assign(new Error('Some requested reference sections cannot be reproduced from the supplied footage.'), { code: 'insufficient_source', capabilityReport })
    await store.transition(job.id, 'planning', 50)
    const plan = buildEditPlan({ instruction: job.instruction, sourceAnalysis, referenceAnalysis, capabilityReport })
    const ai = await callProvider(JSON.stringify({ instruction: job.instruction, sourceAnalysis, referenceAnalysis, capabilityReport }), 'build-edit-plan', { precision: 'millisecond', neverInventMissingFootage: true })
    if (!ai.ok) throw Object.assign(new Error(ai.error?.message || ai.error?.userMessage || 'AI planning failed'), { code: ai.error?.code || 'planning_failed' })
    const aiOutput = ai.data?.output && typeof ai.data.output === 'object' ? ai.data.output : ai.data
    const operations = Array.isArray(aiOutput?.operations) ? aiOutput.operations : []
    const executablePlan = { ...plan, ...(aiOutput && typeof aiOutput === 'object' ? aiOutput : {}), operations, ai: { provider: ai.data?.provider, model: ai.data?.model } }
    const validatedPlan = validateEditPlan(executablePlan, { durationMs: sourceAnalysis.durationMs })
    await store.save({ ...(await store.get(job.id)), editPlan: validatedPlan })
    await store.transition(job.id, 'processing', 70)
    await store.transition(job.id, 'rendering', 90)
    if (typeof renderVideo !== 'function') throw Object.assign(new Error('A render worker is not configured yet.'), { code: 'renderer_unavailable' })
    if (!body.sourcePath || !body.outputPath) throw Object.assign(new Error('Render media paths are not configured.'), { code: 'render_media_missing' })
    const rendered = await renderVideo({ inputPath: body.sourcePath, outputPath: body.outputPath, plan: validatedPlan })
    if (!rendered?.outputPath) throw Object.assign(new Error('Renderer returned no output file.'), { code: 'render_output_missing' })
    const current = await store.get(job.id)
    await store.save({ ...current, state: 'completed', progress: 100, output: { status: 'ready', renderer: rendered.renderer || 'ffmpeg', path: rendered.outputPath, planVersion: validatedPlan.version } })
    await consumeEntitlement(auth, { requestId: job.id })
  } catch (error) {
    const current = await store.get(job.id)
    if (current) await store.save({ ...current, state: 'failed', progress: 100, error: { code: error?.code || 'edit_failed', userMessage: error?.code === 'insufficient_source' ? error.message : 'Pilgrix could not complete this edit. No unsupported footage was invented.', capabilityReport: error?.capabilityReport, message: error?.message || 'Unknown error' } })
  }
}

function normalizeAnalysis(value) { return createAnalysis({ durationMs: Number(value?.durationMs || 0), shots: value?.shots || [], scenes: value?.scenes || [], speech: value?.speech || [], beats: value?.beats || [], objects: value?.objects || [], actions: value?.actions || [], motion: value?.motion || [], ocr: value?.ocr || [], audio: value?.audio || [], metadata: value?.metadata || {} }) }
function publicJob(job) { return { id: job.id, state: job.state, progress: job.progress, instruction: job.instruction, analysis: job.analysis, capabilityReport: job.capabilityReport, editPlan: job.editPlan, output: job.output, error: job.error, createdAt: job.createdAt, updatedAt: job.updatedAt } }
async function readJson(req) { const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} } }
