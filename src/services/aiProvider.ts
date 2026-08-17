/**
 * AI provider adapter behind a server-side API boundary.
 *
 * The browser never calls the upstream provider directly. Instead it sends a
 * generic request to a local secure endpoint, and the backend is responsible for
 * resolving provider credentials and calling the upstream AI API.
 */

import { config, hasAiConfig } from '@/lib/config'
import type {
  AIAction,
  AIConfigurationStatus,
  AIProviderName,
  ApiError,
} from '@/types'

export interface ServerAIConfig {
  provider: AIProviderName
  apiUrl: string
  model: string
  configured: boolean
}

export type AIErrorPayload = Partial<ApiError>

export interface AIRequestInput {
  prompt: string
  assetId?: string
  action?: string
  context?: Record<string, unknown>
}

export interface AIProviderAdapter {
  readonly provider: AIProviderName
  readonly apiUrl: string
  readonly model: string
  readonly configurationStatus: AIConfigurationStatus
  isConfigured(): boolean
  execute(request: AIRequestInput): Promise<AIAction>
}

const getServerAiConfig = async (): Promise<ServerAIConfig | null> => {
  try {
    const response = await fetch('/api/ai/config', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const provider =
      payload.provider === 'openai' || payload.provider === 'anthropic'
        ? payload.provider
        : 'none'

    const apiUrl = typeof payload.apiUrl === 'string' ? payload.apiUrl : ''
    const model = typeof payload.model === 'string' ? payload.model : 'not-configured'

    return {
      provider,
      apiUrl,
      model,
      configured: provider !== 'none' && Boolean(apiUrl) && model !== 'not-configured',
    }
  } catch {
    return null
  }
}

const buildAction = (
  request: AIRequestInput,
  status: AIAction['status'],
  configuration: AIConfigurationStatus,
  message: string,
  error?: AIErrorPayload,
): AIAction => ({
  id: `ai-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: request.action === 'generate' ? 'generate' : 'enhance',
  params: {
    assetId: request.assetId ?? null,
    action: request.action ?? 'enhance',
    prompt: request.prompt,
    context: request.context ?? {},
    provider: config.ai.provider,
  },
  configuration,
  status,
  result: {
    provider: config.ai.provider,
    model: config.ai.model,
    message,
    ...(error ? { error } : {}),
  },
})

export const aiProvider: AIProviderAdapter = {
  get provider() {
    return config.ai.provider
  },

  get apiUrl() {
    return config.ai.apiUrl
  },

  get model() {
    return config.ai.model
  },

  get configurationStatus() {
    return hasAiConfig ? 'configured' : 'not_configured'
  },

  isConfigured(): boolean {
    return hasAiConfig
  },

  async execute(request: AIRequestInput): Promise<AIAction> {
    const serverConfig = await getServerAiConfig()
    const effectiveProvider = serverConfig?.provider ?? config.ai.provider
    const effectiveApiUrl = serverConfig?.apiUrl ?? config.ai.apiUrl
    const effectiveModel = serverConfig?.model ?? config.ai.model
    const isConfigured = Boolean(
      serverConfig?.configured ?? (config.ai.provider !== 'none' && config.ai.apiUrl && config.ai.model !== 'not-configured'),
    )

    if (!isConfigured) {
      return buildAction(
        request,
        'not_configured',
        'not_configured',
        'AI provider is not configured for this environment.',
      )
    }

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: effectiveProvider,
          model: effectiveModel,
          apiUrl: effectiveApiUrl,
          prompt: request.prompt,
          assetId: request.assetId ?? null,
          action: request.action ?? 'enhance',
          context: request.context ?? {},
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        const message =
          errorPayload?.error?.message ??
          'The configured AI provider request failed on the server-side boundary.'

        return buildAction(
          request,
          'failed',
          'configured',
          message,
          {
            code: 'service_unavailable',
            message,
            userMessage: 'The AI provider request failed. Server-side configuration or credentials are still required.',
            status: response.status,
            retryable: true,
          },
        )
      }

      const payload = await response.json().catch(() => ({ message: 'AI request succeeded.' }))

      return {
        id: `ai-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: request.action === 'generate' ? 'generate' : 'enhance',
        params: {
          assetId: request.assetId ?? null,
          action: request.action ?? 'enhance',
          prompt: request.prompt,
          context: request.context ?? {},
          provider: config.ai.provider,
        },
        configuration: 'configured',
        status: 'succeeded',
        result: {
          provider: config.ai.provider,
          model: config.ai.model,
          message: payload?.message ?? 'AI request succeeded.',
          output: payload?.output ?? payload?.content,
        },
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI provider request failed. Configure the server-side provider and credentials.'

      return buildAction(
        request,
        'failed',
        'configured',
        message,
        {
          code: 'service_unavailable',
          message,
          userMessage: 'The AI provider is configured, but the request could not be completed. Server-side credentials are still required.',
          status: 503,
          retryable: true,
        },
      )
    }
  },
}
