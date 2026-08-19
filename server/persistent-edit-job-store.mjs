import { createEditJob, transitionJob } from './edit-engine.mjs'

const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const headers = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' })

export function isPersistentEditJobStoreConfigured() { return configured() }

export function createPersistentEditJobStore() {
  const base = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/edit_jobs`

  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } })
    if (!response.ok) throw new Error(`Edit job persistence failed with ${response.status}`)
    return response
  }

  return {
    async create(input) {
      const job = createEditJob(input)
      await request(base, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(toRow(job)) })
      return job
    },
    async get(id) {
      const response = await request(`${base}?id=eq.${encodeURIComponent(id)}&limit=1`)
      const rows = await response.json()
      return rows[0] ? fromRow(rows[0]) : null
    },
    async save(job) {
      await request(`${base}?id=eq.${encodeURIComponent(job.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(toRow(job)) })
      return job
    },
    async transition(id, state, progress) {
      const job = await this.get(id)
      if (!job) throw new Error('Edit job not found')
      return this.save(transitionJob(job, state, progress))
    },
  }
}

const toRow = (job) => ({ id: job.id, user_id: job.userId, instruction: job.instruction, state: job.state, progress: job.progress, source_media: job.sourceMedia, reference_media: job.referenceMedia, analysis: job.analysis, capability_report: job.capabilityReport, edit_plan: job.editPlan, output: job.output, error: job.error, created_at: job.createdAt, updated_at: job.updatedAt })
const fromRow = (row) => ({ id: row.id, userId: row.user_id, instruction: row.instruction, state: row.state, progress: row.progress, sourceMedia: row.source_media || [], referenceMedia: row.reference_media || [], analysis: row.analysis, capabilityReport: row.capability_report, editPlan: row.edit_plan, output: row.output, error: row.error, createdAt: row.created_at, updatedAt: row.updated_at })
