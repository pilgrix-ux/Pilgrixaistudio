/**
 * Export pipeline service.
 *
 * Export is only considered successful when a processing job has completed and a
 * downloadable output exists.
 */

import { config } from '@/lib/config'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse, ExportAsset } from '@/types'

const exports = new Map<string, ExportAsset>()

export const exportService = {
  async createExport(
    projectId: string,
    jobId: string,
    filename = 'pilgrix-export',
  ): Promise<ApiResponse<ExportAsset>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<ExportAsset>('/api/exports', {
        method: 'POST',
        body: { projectId, jobId, filename },
      })
    }

    const exportAsset: ExportAsset = {
      exportId: `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      jobId,
      filename,
      mimeType: 'application/octet-stream',
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    exports.set(exportAsset.exportId, exportAsset)

    return {
      ok: true,
      data: exportAsset,
      requestId: `local-export-create-${exportAsset.exportId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async getExport(exportId: string): Promise<ApiResponse<ExportAsset | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<ExportAsset | null>(`/api/exports/${exportId}`)
    }

    return {
      ok: true,
      data: exports.get(exportId) ?? null,
      requestId: `local-export-get-${exportId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async markReady(exportId: string): Promise<ApiResponse<ExportAsset | null>> {
    const existing = exports.get(exportId)
    if (!existing) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: `Export ${exportId} not found`,
          userMessage: 'The export record was not found.',
          status: 404,
          requestId: `local-export-ready-${exportId}`,
          retryable: false,
        },
        requestId: `local-export-ready-${exportId}`,
        timestamp: new Date().toISOString(),
      }
    }

    const ready: ExportAsset = {
      ...existing,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      storageReference: `exports/${exportId}/${existing.filename}`,
      downloadUrl: `/downloads/${exportId}`,
    }
    exports.set(exportId, ready)

    return {
      ok: true,
      data: ready,
      requestId: `local-export-ready-${exportId}`,
      timestamp: new Date().toISOString(),
    }
  },
}
