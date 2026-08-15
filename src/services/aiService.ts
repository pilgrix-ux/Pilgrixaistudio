/**
 * AI service stub - placeholder for future AI integration
 */

import { AIAction } from '@/types'

export const aiService = {
  /**
   * Placeholder for AI-assisted editing
   */
  async processMediaWithAI(
    assetId: string,
    action: string,
  ): Promise<AIAction> {
    // Stub implementation - will integrate with real AI API later
    const result: AIAction = {
      id: `ai-action-${Date.now()}`,
      type: 'enhance',
      params: { assetId, action },
      status: 'pending',
    }
    return result
  },

  /**
   * Generate suggestions for media editing
   */
  async getEditingSuggestions(): Promise<string[]> {
    // Stub - will be replaced with actual AI API
    return [
      'Feature not yet available',
      'Connect to AI service in settings',
    ]
  },
}
