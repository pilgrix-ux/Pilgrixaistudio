/**
 * Central API client and request normalization layer.
 *
 * This application does not currently have a configured backend provider,
 * so the default runtime is a deterministic local-development adapter.
 * The service layer is still centralized here so real HTTP integrations can
 * replace the local implementation without reworking UI call sites.
 */

import { config } from '@/lib/config'
import type { ApiError, ApiResponse } from '@/types'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  authRequired?: boolean
}

export function normalizeError(
  error: Partial<ApiError> & { message?: string },
  fallbackStatus = 500,
  requestId = 'local-dev-request',
): ApiError {
  return {
    code: error.code ?? 'unexpected_error',
    message: error.message ?? 'Unexpected server error',
    userMessage:
      error.userMessage ?? 'Something went wrong. Please try again later.',
    status: error.status ?? fallbackStatus,
    requestId,
    details: error.details,
    retryable: error.retryable ?? false,
  }
}

export function buildApiError(
  code: ApiError['code'],
  message: string,
  userMessage: string,
  status: number,
  details?: Record<string, unknown>,
  retryable = false,
  requestId = 'local-dev-request',
): ApiError {
  return {
    code,
    message,
    userMessage,
    status,
    requestId,
    details,
    retryable,
  }
}

export function buildNotConfiguredResponse<T>(
  serviceName: string,
  path: string,
  requestId = 'local-dev-request',
): ApiResponse<T> {
  return {
    ok: false,
    error: buildApiError(
      'configuration_error',
      `${serviceName} is not configured for this environment.`,
      'This capability is not connected yet. Configure the provider to enable this operation.',
      503,
      {
        service: serviceName,
        path,
      },
      false,
      requestId,
    ),
    requestId,
    timestamp: new Date().toISOString(),
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const method = options.method ?? 'GET'

    if (config.api.mode === 'local-dev') {
      return {
        ok: true,
        data: undefined as T,
        requestId,
        timestamp: new Date().toISOString(),
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body:
        options.body !== undefined && method !== 'GET'
          ? JSON.stringify(options.body)
          : undefined,
    })

    const payload = (await response.json().catch(() => ({}))) as Partial<
      ApiResponse<T>
    >

    if (!response.ok) {
      const error = normalizeError(
        {
          code: payload.error?.code ?? 'unexpected_error',
          message: payload.error?.message ?? 'Request failed',
          userMessage: payload.error?.userMessage ?? 'Request failed',
          status: response.status,
          details: payload.error?.details,
          retryable: payload.error?.retryable ?? false,
        },
        response.status,
        requestId,
      )

      return {
        ok: false,
        error,
        requestId,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      ok: true,
      data: payload.data as T,
      requestId,
      timestamp: new Date().toISOString(),
    }
  }
}

export const apiClient = new ApiClient(config.api.baseUrl)
