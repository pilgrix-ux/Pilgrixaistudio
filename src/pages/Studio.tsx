import { AiLabWorkspace } from '@/components/AiLabWorkspace'

/**
 * Production entry point for the Pilgrix studio.
 *
 * AI Lab is the primary application surface. Keep the page as a thin
 * composition boundary so the product shell cannot accidentally fall back to
 * the legacy Projects dashboard.
 */
export function Studio() {
  return <AiLabWorkspace />
}
