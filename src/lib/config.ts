/**
 * Configuration utilities.
 *
 * Public browser config is kept separate from server-only secrets. This app does
 * not yet have a configured backend provider, so integrations remain explicit
 * and disabled by default.
 */

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: 30000,
    mode: (import.meta.env.VITE_API_MODE as 'local-dev' | 'remote' | undefined) || 'local-dev',
  },

  app: {
    name: import.meta.env.VITE_APP_NAME || 'Pilgrixaistudio',
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
  },

  auth: {
    provider: (import.meta.env.VITE_AUTH_PROVIDER as 'none' | 'supabase' | undefined) || 'none',
    sessionStorageKey: 'pilgrixaistudio-session',
  },

  ai: {
    provider: (import.meta.env.VITE_AI_PROVIDER as 'none' | 'openai' | 'configured' | undefined) || 'none',
    model: import.meta.env.VITE_AI_MODEL || 'not-configured',
    apiUrl: import.meta.env.VITE_AI_API_URL || '',
  },

  storage: {
    provider: (import.meta.env.VITE_STORAGE_PROVIDER as 'none' | 'local-dev' | 'supabase' | 's3' | undefined) || 'local-dev',
    bucket: import.meta.env.VITE_STORAGE_BUCKET || 'pilgrixaistudio-media',
    maxFileSize: Number(import.meta.env.VITE_MAX_FILE_SIZE || '104857600'),
  },

  integrations: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
}

export const isProduction = import.meta.env.PROD
export const isDevelopment = import.meta.env.DEV
