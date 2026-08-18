import { createEditJob, transitionJob } from './edit-engine.mjs'

export function createEditJobStore({ persistence } = {}) {
  const memory = new Map()

  async function create(input) {
    const job = createEditJob(input)
    await save(job)
    return job
  }

  async function get(id) {
    if (persistence?.get) return persistence.get(id)
    return memory.get(id) ?? null
  }

  async function save(job) {
    memory.set(job.id, job)
    if (persistence?.save) await persistence.save(job)
    return job
  }

  async function transition(id, state, progress) {
    const job = await get(id)
    if (!job) throw new Error('Edit job not found')
    return save(transitionJob(job, state, progress))
  }

  return { create, get, save, transition }
}
