/**
 * Authentication/session boundary.
 *
 * This app is intentionally not connected to an auth provider by default. The
 * service exposes a not_configured session instead of pretending an auth flow is
 * active.
 */

import { config } from '@/lib/config'
import type { AuthSession } from '@/types'

export const authService = {
  getSession(): AuthSession {
    if (config.auth.provider === 'none') {
      return {
        user: null,
        status: 'not_configured',
      }
    }

    return {
      user: null,
      status: 'anonymous',
    }
  },

  signOut(): AuthSession {
    return {
      user: null,
      status: 'not_configured',
    }
  },
}
