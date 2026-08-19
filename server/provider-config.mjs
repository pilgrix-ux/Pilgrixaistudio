/**
 * Provider configuration lives only on the server.
 * Add real credentials through deployment environment variables later.
 * Never put provider secrets in src/ or client/runtime configuration.
 */

export const PROVIDER_CONFIG = Object.freeze({
  storage: {
    provider: process.env.MEDIA_STORAGE_PROVIDER || 'supabase',
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  vision: {
    provider: process.env.VISION_PROVIDER || 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.VISION_MODEL || '',
  },
  reasoning: {
    provider: process.env.REASONING_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.REASONING_MODEL || '',
  },
  mediaModels: {
    provider: process.env.MEDIA_MODELS_PROVIDER || 'fal',
    apiKey: process.env.FAL_KEY || '',
  },
  speech: {
    provider: process.env.SPEECH_PROVIDER || '',
    apiKey: process.env.SPEECH_API_KEY || '',
    model: process.env.SPEECH_MODEL || '',
  },
  payments: {
    provider: process.env.PAYMENTS_PROVIDER || 'stripe',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
})

export function assertProviderConfigured(name, config = PROVIDER_CONFIG) {
  const provider = config[name]
  if (!provider) throw new Error(`Unknown provider configuration: ${name}`)
  const secretFields = ['apiKey', 'serviceRoleKey', 'secretKey', 'webhookSecret']
  const hasSecret = secretFields.some((field) => Boolean(provider[field]))
  if (!hasSecret) throw new Error(`${name} provider credentials are not configured yet.`)
  return provider
}
