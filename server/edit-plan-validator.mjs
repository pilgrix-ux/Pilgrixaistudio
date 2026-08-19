const OPERATIONS = new Set(['trim', 'concat', 'speed', 'volume', 'fade', 'caption', 'transition', 'zoom', 'crop', 'color', 'blur', 'remove_background'])

export function validateEditPlan(plan, { durationMs = 0 } = {}) {
  if (!plan || typeof plan !== 'object') throw new Error('Edit plan is required')
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('A valid source duration is required')
  if (!Array.isArray(plan.operations)) throw new Error('Edit plan operations must be an array')
  const operations = plan.operations.map((operation, index) => validateOperation(operation, index, durationMs))
  if (!operations.length) throw new Error('The AI did not produce any executable edit operations')
  if (plan.policy?.neverInventMissingFootage !== true) throw new Error('Edit plan must forbid invented source footage')
  return { ...plan, operations }
}

function validateOperation(operation, index, durationMs) {
  if (!operation || typeof operation !== 'object') throw new Error(`Operation ${index} is invalid`)
  if (!OPERATIONS.has(operation.type)) throw new Error(`Operation ${index} uses an unsupported operation`)
  const startMs = number(operation.startMs, `Operation ${index} startMs`)
  const endMs = number(operation.endMs, `Operation ${index} endMs`)
  if (startMs < 0 || endMs < startMs || (durationMs > 0 && endMs > durationMs)) throw new Error(`Operation ${index} has an invalid time range`)
  return { ...operation, startMs, endMs }
}

function number(value, label) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number`)
  return parsed
}

export { OPERATIONS }
