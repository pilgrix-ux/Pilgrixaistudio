/**
 * Configuration utilities
 */

export const config = {
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: 30000,
  },

  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // AI configuration
  ai: {
    openaiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    apiUrl: import.meta.env.VITE_AI_API_URL || '',
    model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
  },

  // Storage configuration
  storage: {
    bucket: import.meta.env.VITE_STORAGE_BUCKET || 'pilgrixaistudio-media',
    maxFileSize: parseInt(
      import.meta.env.VITE_MAX_FILE_SIZE || '104857600',
      10,
    ),
  },

  // App configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Pilgrixaistudio',
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
  },
}

export const isProduction = import.meta.env.PROD
export const isDevelopment = import.meta.env.DEV
