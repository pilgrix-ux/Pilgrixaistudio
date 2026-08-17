/**
 * AI service boundary for the editor.
 *
 * This layer intentionally does not hold provider secrets. It delegates to a
 * provider-agnostic adapter that calls a secure server-side API endpoint. If the
 * provider is not configured or the backend request fails, the service returns a
 * typed failure state instead of fabricating a successful AI response.
 */

import { aiProvider } from '@/services/aiProvider'
import type { AIAction } from '@/types'

export const aiService = {
  async processMediaWithAI(
    assetId: string,
    action: string,
  ): Promise<AIAction> {
    const execution = await aiProvider.execute({
      assetId,
      action,
      prompt: `Apply the requested ${action} operation to asset ${assetId}.`,
      context: {
        source: 'editor-service',
      },
    })

    return execution
  },

  async getEditingSuggestions(): Promise<string[]> {
    if (!aiProvider.isConfigured()) {
      return ['Editor AI is not configured for this environment.']
    }

    return [
      'AI editing assistance is configured for the secure server-side boundary. Live suggestions require backend provider credentials and a valid upstream model endpoint.',
    ]
  },
}
