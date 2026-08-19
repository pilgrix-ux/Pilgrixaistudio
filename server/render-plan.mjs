import { validateEditPlan } from './edit-plan-validator.mjs'

export function buildRenderPlan(editPlan, { durationMs, inputPath, outputPath }) {
  if (!inputPath || !outputPath) throw new Error('Input and output paths are required')
  const validated = validateEditPlan(editPlan, { durationMs })
  return {
    version: 1,
    inputPath,
    outputPath,
    durationMs,
    operations: validated.operations,
    requireOutputFile: true,
    ffmpeg: buildFfmpegOperations(validated.operations),
  }
}

function buildFfmpegOperations(operations) {
  return operations.map((operation) => ({
    type: operation.type,
    startMs: operation.startMs,
    endMs: operation.endMs,
    params: operation.params || {},
  }))
}
