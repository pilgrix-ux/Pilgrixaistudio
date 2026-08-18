const DEFAULTS = Object.freeze({
  ui: { theme: 'light', showFeedbackPrompt: true, showUsage: false },
  features: { aiLab: true, referenceEditing: true, trendDiscovery: true, feedback: true },
  uploads: { maxBytes: 20 * 1024 * 1024 * 1024, resumable: true },
  trial: { videoEdits: 3 },
  plans: {},
  providers: { vision: 'gemini', reasoning: 'openai', mediaModels: 'fal', speech: '', search: '' },
})

export function createProductConfig(overrides = {}) {
  return deepMerge(DEFAULTS, overrides)
}

export function getRuntimeProductConfig(env = process.env) {
  return createProductConfig({
    ui: {
      theme: env.PILGRIX_THEME || DEFAULTS.ui.theme,
      showFeedbackPrompt: env.PILGRIX_FEEDBACK_PROMPT !== 'false',
      showUsage: env.PILGRIX_SHOW_USAGE === 'true',
    },
    uploads: {
      maxBytes: Number(env.PILGRIX_MAX_UPLOAD_BYTES || DEFAULTS.uploads.maxBytes),
    },
    trial: { videoEdits: Number(env.PILGRIX_FREE_VIDEO_EDITS || DEFAULTS.trial.videoEdits) },
  })
}

function deepMerge(base, override) {
  const result = { ...base }
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object') {
      result[key] = deepMerge(base[key], value)
    } else if (value !== undefined) result[key] = value
  }
  return result
}
