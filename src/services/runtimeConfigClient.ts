export type RuntimeConfig = {
  version: number
  app: { name: string; tagline: string }
  theme: Record<string, string>
  navigation: Record<string, { label: string; enabled: boolean }>
  aiLab: {
    eyebrow: string
    heading: string
    headingAccent: string
    composerPlaceholder: string
    welcome: string
    workingTitle: string
    workingSubtitle: string
    starterPrompts: Array<{ title: string; detail: string; action: string }>
    tools: Array<{ title: string; detail: string; action: string; enabled: boolean }>
  }
  plans: Record<string, { label: string; storageBytes: number; videoEdits: number }>
  features: Record<string, boolean>
}

export async function fetchRuntimeConfig(baseUrl = ''): Promise<RuntimeConfig | null> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/runtime-config`, { cache: 'no-store' })
    if (!response.ok) return null
    const payload = await response.json()
    return payload?.ok ? payload.config as RuntimeConfig : null
  } catch {
    return null
  }
}

export function applyRuntimeTheme(config: RuntimeConfig): void {
  const root = document.documentElement
  const themeMap: Record<string, string> = {
    background: '--pilgrix-background',
    surface: '--pilgrix-surface',
    ink: '--pilgrix-ink',
    muted: '--pilgrix-muted',
    blue: '--pilgrix-blue',
    cyan: '--pilgrix-cyan',
    accent: '--pilgrix-accent',
  }
  for (const [key, variable] of Object.entries(themeMap)) {
    const value = config.theme?.[key]
    if (value) root.style.setProperty(variable, value)
  }
  document.title = config.app?.name || 'Pilgrix'
}
