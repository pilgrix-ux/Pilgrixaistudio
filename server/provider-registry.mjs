import { PROVIDER_CONFIG } from './provider-config.mjs'

export const PROVIDER_CAPABILITIES = Object.freeze({
  auth: ['authenticate', 'oauth'],
  storage: ['upload', 'download', 'delete', 'signedUrl'],
  vision: ['analyzeVideo', 'analyzeReference'],
  reasoning: ['createEditPlan'],
  mediaModels: ['track', 'segment', 'enhance', 'generate'],
  speech: ['transcribe', 'timestamps'],
  search: ['search', 'resolveReference'],
  render: ['render'],
  queue: ['enqueue', 'status'],
  cdn: ['publish', 'signedUrl'],
  billing: ['checkout', 'portal', 'webhook'],
  email: ['send'],
  sms: ['sendVerification'],
  errors: ['capture'],
  logging: ['write'],
  analytics: ['track'],
  support: ['createTicket'],
})

export function getProviderStatus() {
  return Object.fromEntries(Object.entries(PROVIDER_CONFIG).map(([name, config]) => [name, {
    provider: config.provider || null,
    configured: ['apiKey', 'serviceRoleKey', 'secretKey', 'webhookSecret'].some((key) => Boolean(config[key])),
    capabilities: PROVIDER_CAPABILITIES[name] || [],
  }]))
}

export function requireProvider(name, capability) {
  const config = PROVIDER_CONFIG[name]
  const capabilities = PROVIDER_CAPABILITIES[name]
  if (!config || !capabilities?.includes(capability)) {
    throw new Error(`provider_capability_unavailable:${name}:${capability}`)
  }
  const secretPresent = ['apiKey', 'serviceRoleKey', 'secretKey', 'webhookSecret'].some((key) => Boolean(config[key]))
  if (!secretPresent && name !== 'render') throw new Error(`provider_not_configured:${name}`)
  return config
}
