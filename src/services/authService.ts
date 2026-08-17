/**
 * Authentication/session boundary.
 *
 * This app does not render an auth screen yet. The service remains the only auth
 * boundary and can connect to a real provider such as Supabase when public client
 * configuration is available. If the backend is not configured, it reports a
 * typed not_configured state instead of pretending authentication succeeded.
 */

import { config, hasSupabaseConfig } from '@/lib/config'
import type { AuthSession } from '@/types'

const SESSION_KEY = config.auth.sessionStorageKey

const readStoredSession = (): AuthSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

const writeStoredSession = (session: AuthSession): void => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage write failures in unsupported environments.
  }
}

const isSupabaseAuthConfigured = (): boolean => config.auth.provider === 'supabase' && hasSupabaseConfig

export const authService = {
  restoreSession(): AuthSession {
    const stored = readStoredSession()
    if (stored) {
      return stored
    }

    if (config.auth.provider === 'none') {
      return { user: null, status: 'not_configured', provider: 'none' }
    }

    return { user: null, status: 'anonymous', provider: 'supabase' }
  },

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    if (!isSupabaseAuthConfigured()) {
      return {
        user: null,
        status: 'not_configured',
        provider: 'none',
      }
    }

    const response = await fetch(`${config.integrations.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.integrations.supabaseAnonKey,
        Authorization: `Bearer ${config.integrations.supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      return {
        user: null,
        status: 'anonymous',
        provider: 'supabase',
      }
    }

    const payload = (await response.json()) as {
      access_token?: string
      user?: { id?: string; email?: string; user_metadata?: { name?: string } }
      expires_in?: number
    }

    const session: AuthSession = {
      user: payload.user
        ? {
            id: payload.user.id ?? 'unknown-user',
            email: payload.user.email,
            name: payload.user.user_metadata?.name,
          }
        : null,
      status: payload.access_token ? 'authenticated' : 'anonymous',
      token: payload.access_token,
      provider: 'supabase',
      expiresAt: payload.expires_in
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : undefined,
    }

    writeStoredSession(session)
    return session
  },

  async signOut(): Promise<AuthSession> {
    const current = this.restoreSession()
    if (config.auth.provider === 'none') {
      return {
        user: null,
        status: 'not_configured',
        provider: 'none',
      }
    }

    const token = current.token
    if (token && isSupabaseAuthConfigured()) {
      await fetch(`${config.integrations.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: config.integrations.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined)
    }

    const anonymous: AuthSession = {
      user: null,
      status: 'anonymous',
      provider: 'supabase',
    }

    writeStoredSession(anonymous)
    return anonymous
  },

  getSession(): AuthSession {
    return this.restoreSession()
  },
}
