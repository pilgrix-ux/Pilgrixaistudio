const DEFAULT_RUNTIME_CONFIG = {
  version: 1,
  app: {
    name: 'Pilgrix',
    tagline: 'Make the video. We’ll handle the rest.',
  },
  theme: {
    background: '#F5F0E8',
    surface: '#FFFDF8',
    ink: '#121212',
    muted: '#6B7280',
    blue: '#2F80ED',
    cyan: '#56CCF2',
    accent: '#00E5FF',
  },
  navigation: {
    aiLab: { label: 'AI Lab', enabled: true },
    main: { label: 'Main', enabled: true },
    me: { label: 'Me', enabled: true },
  },
  aiLab: {
    eyebrow: 'AI LAB',
    heading: 'Make the video.',
    headingAccent: 'We’ll handle the rest.',
    composerPlaceholder: 'Upload your video and tell Pilgrix what you want...',
    welcome: 'Tell me what you want to make. You can drop your footage here, add a reference, or just describe the result.',
    workingTitle: 'Pilgrix is working',
    workingSubtitle: 'Preparing your edit.',
    starterPrompts: [
      { title: 'Make something good', detail: 'Find the strongest story in my footage', action: 'smart-edit' },
      { title: 'Find the viral parts', detail: 'Turn the best moments into short clips', action: 'find-viral-parts' },
      { title: 'Match a reference', detail: 'Upload a reference and I’ll adapt the edit', action: 'reference-edit' },
    ],
    tools: [
      { title: 'Smart Edit', detail: 'Cuts, pacing, transitions', action: 'smart-edit', enabled: true },
      { title: 'Remove Background', detail: 'Clean subject isolation', action: 'remove-background', enabled: true },
      { title: 'Find Moments', detail: 'Precise highlights and scenes', action: 'find-moments', enabled: true },
      { title: 'Cut & Clip', detail: 'Turn long footage into shorts', action: 'cut-clip', enabled: true },
    ],
  },
  plans: {
    free: { label: 'Free', storageBytes: 5 * 1024 ** 3, videoEdits: 3 },
    starter: { label: 'Starter', storageBytes: 100 * 1024 ** 3, videoEdits: 100 },
    growth: { label: 'Growth', storageBytes: 1024 * 1024 ** 3, videoEdits: 500 },
    pro: { label: 'Pro', storageBytes: 5 * 1024 ** 3, videoEdits: 2000 },
  },
  features: {
    referenceEditing: true,
    trendResearch: true,
    backgroundRemoval: true,
    viralClips: true,
    notifications: true,
    recentlyDeleted: true,
  },
}

const clone = (value) => JSON.parse(JSON.stringify(value))
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

function mergeConfig(base, override) {
  if (!isObject(override)) return clone(base)
  const result = clone(base)
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) result[key] = mergeConfig(result[key], value)
    else result[key] = value
  }
  return result
}

const supabaseHeaders = (serviceRoleKey) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
})

export function createRuntimeConfigService({ supabaseUrl = process.env.SUPABASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  let cached = null
  let cachedAt = 0
  const cacheMs = Number(process.env.RUNTIME_CONFIG_CACHE_MS || 15_000)

  async function read() {
    const now = Date.now()
    if (cached && now - cachedAt < cacheMs) return clone(cached)
    if (!supabaseUrl || !serviceRoleKey) return clone(DEFAULT_RUNTIME_CONFIG)

    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/runtime_config?select=config&key=eq.global&limit=1`, {
        headers: supabaseHeaders(serviceRoleKey),
      })
      if (!response.ok) return clone(DEFAULT_RUNTIME_CONFIG)
      const rows = await response.json()
      cached = mergeConfig(DEFAULT_RUNTIME_CONFIG, rows?.[0]?.config || {})
      cachedAt = now
      return clone(cached)
    } catch {
      return clone(DEFAULT_RUNTIME_CONFIG)
    }
  }

  async function write(patch) {
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Persistent runtime configuration is not configured.')
    const current = await read()
    const next = mergeConfig(current, patch)
    next.version = Number(current.version || 1) + 1

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/runtime_config?on_conflict=key`, {
      method: 'POST',
      headers: { ...supabaseHeaders(serviceRoleKey), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ key: 'global', config: next, updated_at: new Date().toISOString() }),
    })
    if (!response.ok) throw new Error(`Runtime configuration update failed with ${response.status}.`)
    cached = next
    cachedAt = Date.now()
    return clone(next)
  }

  return { read, write }
}

export { DEFAULT_RUNTIME_CONFIG }
