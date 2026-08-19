import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

const SUPPORTED = new Set(['trim', 'cut', 'speed', 'crop', 'zoom', 'fade', 'volume', 'text', 'scale'])

export function validateRenderPlan(plan) {
  if (!plan || !Array.isArray(plan.operations)) throw new Error('A render plan with operations is required')
  for (const operation of plan.operations) {
    if (!SUPPORTED.has(operation.type)) throw new Error(`Unsupported render operation: ${operation.type}`)
    if (!Number.isFinite(Number(operation.startMs || 0))) throw new Error('Render operation timestamp must be numeric')
    if (operation.endMs != null && Number(operation.endMs) < Number(operation.startMs || 0)) throw new Error('Render operation endMs must not precede startMs')
  }
  if (plan.policy?.neverInventMissingFootage !== true) throw new Error('Render plans must forbid invented source footage')
  return true
}

export async function renderWithFfmpeg({ inputPath, outputPath, plan, ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg' }) {
  await access(inputPath)
  validateRenderPlan(plan)
  const filters = buildVideoFilters(plan.operations)
  const args = ['-y', '-i', inputPath]
  if (filters.length) args.push('-vf', filters.join(','))
  args.push('-c:v', 'libx264', '-preset', process.env.FFMPEG_PRESET || 'medium', '-crf', process.env.FFMPEG_CRF || '18', '-c:a', 'aac', '-movflags', '+faststart', outputPath)
  await run(ffmpegPath, args)
  return { outputPath, renderer: 'ffmpeg' }
}

function buildVideoFilters(operations) {
  const filters = []
  for (const op of operations) {
    if (op.type === 'scale') filters.push(`scale=${positiveInt(op.width, 1920)}:${positiveInt(op.height, 1080)}`)
    if (op.type === 'crop') filters.push(`crop=${positiveInt(op.width, 1080)}:${positiveInt(op.height, 1920)}:${nonNegativeInt(op.x)}:${nonNegativeInt(op.y)}`)
    if (op.type === 'zoom') filters.push(`scale=iw*${boundedNumber(op.amount, 1, 1, 4)}:ih*${boundedNumber(op.amount, 1, 1, 4)}`)
    if (op.type === 'speed') filters.push(`setpts=${(1 / boundedNumber(op.factor, 1, 0.25, 4)).toFixed(6)}*PTS`)
    if (op.type === 'fade') filters.push(`${op.direction === 'out' ? 'fade=t=out' : 'fade=t=in'}:st=${Math.max(0, Number(op.startMs || 0)) / 1000}:d=${Math.max(0.001, Number(op.durationMs || 250)) / 1000}`)
    if (op.type === 'text') {
      const text = String(op.text || '').replace(/[:\\']/g, '\\$&')
      filters.push(`drawtext=text='${text}':x=${Number(op.x || 20)}:y=${Number(op.y || 20)}:fontsize=${positiveInt(op.fontSize, 48)}`)
    }
  }
  return filters
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}: ${stderr.slice(-2000)}`)))
  })
}
const boundedNumber = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback))
const positiveInt = (value, fallback) => Math.max(1, Math.round(Number.isFinite(Number(value)) ? Number(value) : fallback))
const nonNegativeInt = (value) => Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0))
