/**
 * Editor-focused AI boundary.
 *
 * This project intentionally keeps the in-app editor AI separate from the
 * AI Companion Hub chatbot experience. Real provider connections are disabled by
 * default and must be configured explicitly via environment variables.
 */

import { config } from '@/lib/config'
import type { AIAction } from '@/types'

export const aiService = {
  async processMediaWithAI(
    assetId: string,
    action: string,
  ): Promise<AIAction> {
    if (config.ai.provider === 'none') {
      return {
        id: `ai-action-${Date.now()}`,
        type: 'not_configured',
        params: { assetId, action, provider: config.ai.provider },
        status: 'not_configured',
        result: {
          provider: config.ai.provider,
          message: 'Editor AI is not configured for this environment.',
        },
      }
    }

    return {
      id: `ai-action-${Date.now()}`,
      type: 'enhance',
      params: { assetId, action, provider: config.ai.provider },
      status: 'pending',
    }
  },

  async getEditingSuggestions(): Promise<string[]> {
    if (config.ai.provider === 'none') {
      return ['Editor AI is not configured for this environment.']
    }

    return ['AI editing assistance is ready for provider integration.']
  },
}
