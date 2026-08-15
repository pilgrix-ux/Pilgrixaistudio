/**
 * Editor AI service.
 *
 * This is the editor AI, not the AI Companion Hub chatbot. The current app does
 * not have a configured AI provider, so this service returns an explicit
 * configuration status instead of pretending an edit succeeded.
 */

import { buildApiError, normalizeError } from '@/services/apiClient'
import type { EditorInstructionRequest, EditorInstructionResult } from '@/types'
import { config } from '@/lib/config'

const editorRequests = new Map<string, EditorInstructionResult>()

export const editorService = {
  async requestInstruction(
    request: EditorInstructionRequest,
  ): Promise<EditorInstructionResult> {
    const requestId = request.requestId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    if (config.ai.provider !== 'configured') {
      const result: EditorInstructionResult = {
        requestId,
        status: 'not_configured',
        operationType: 'not_configured',
        parameters: {
          projectId: request.projectId,
          mediaId: request.mediaId ?? null,
          instruction: request.instruction,
        },
        affectedAssets: request.mediaId ? [request.mediaId] : [],
        error: buildApiError(
          'configuration_error',
          'Editor AI is not configured for this environment.',
          'The editor AI is not connected yet. Configure the provider to enable editing requests.',
          503,
          {
            provider: config.ai.provider,
            projectId: request.projectId,
          },
          false,
          requestId,
        ),
      }

      editorRequests.set(requestId, result)
      return result
    }

    const result: EditorInstructionResult = {
      requestId,
      status: 'accepted',
      operationType: 'enhance',
      parameters: {
        projectId: request.projectId,
        mediaId: request.mediaId ?? null,
        instruction: request.instruction,
        context: request.context ?? {},
      },
      affectedAssets: request.mediaId ? [request.mediaId] : [],
    }

    editorRequests.set(requestId, result)
    return result
  },

  async getRequest(requestId: string): Promise<EditorInstructionResult | undefined> {
    return editorRequests.get(requestId)
  },

  async getRequests(): Promise<EditorInstructionResult[]> {
    return Array.from(editorRequests.values())
  },

  async markFailed(
    requestId: string,
    message: string,
    userMessage: string,
  ): Promise<EditorInstructionResult | undefined> {
    const existing = editorRequests.get(requestId)
    if (!existing) {
      return undefined
    }

    const updated: EditorInstructionResult = {
      ...existing,
      status: 'failed',
      error: normalizeError(
        {
          code: 'processing_failure',
          message,
          userMessage,
          status: 500,
          retryable: true,
        },
        500,
        requestId,
      ),
    }

    editorRequests.set(requestId, updated)
    return updated
  },
}
