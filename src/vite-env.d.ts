/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_MODE?: 'local-dev' | 'remote'
  readonly VITE_AUTH_PROVIDER?: 'none' | 'supabase'
  readonly VITE_AI_PROVIDER?: 'none' | 'openai' | 'configured'
  readonly VITE_AI_API_URL?: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_STORAGE_PROVIDER?: 'none' | 'local-dev' | 'supabase' | 's3'
  readonly VITE_STORAGE_BUCKET?: string
  readonly VITE_MAX_FILE_SIZE?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
