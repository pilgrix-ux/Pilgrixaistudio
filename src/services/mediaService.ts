/**
 * Media service boundary.
 *
 * This keeps upload, metadata, preview, association, and deletion logic behind a
 * typed service and stores files using the storage adapter abstraction.
 */

import { config } from '@/lib/config'
import { apiClient } from '@/services/apiClient'
import { storageService } from '@/services/storageService'
import type { ApiResponse, MediaAsset, MediaType } from '@/types'

const mediaAssets: Map<string, MediaAsset> = new Map()

const inferMediaType = (file: File): MediaType => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

export const mediaService = {
  async uploadMedia(
    projectId: string,
    file: File,
    mediaType?: MediaType,
  ): Promise<ApiResponse<MediaAsset>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<MediaAsset>('/api/media', {
        method: 'POST',
        body: { projectId, file, mediaType },
      })
    }

    const resolvedType = mediaType ?? inferMediaType(file)
    const object = await storageService.put(file, projectId, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      mediaType: resolvedType,
      size: file.size,
      status: 'ready',
    })

    const asset: MediaAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      mediaType: resolvedType,
      size: file.size,
      storageReference: object.reference,
      createdAt: new Date().toISOString(),
      previewUrl: object.url,
      status: 'ready',
    }

    mediaAssets.set(asset.id, asset)

    return {
      ok: true,
      data: asset,
      requestId: `local-media-upload-${asset.id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async listProjectMedia(projectId: string): Promise<ApiResponse<MediaAsset[]>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<MediaAsset[]>(`/api/projects/${projectId}/media`)
    }

    const assets = Array.from(mediaAssets.values()).filter(
      (asset) => asset.projectId === projectId,
    )

    return {
      ok: true,
      data: assets,
      requestId: `local-project-media-${projectId}`,
      timestamp: new Date().toISOString(),
    }
  },

  async getMedia(id: string): Promise<ApiResponse<MediaAsset | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<MediaAsset | null>(`/api/media/${id}`)
    }

    return {
      ok: true,
      data: mediaAssets.get(id) ?? null,
      requestId: `local-media-get-${id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async deleteMedia(id: string): Promise<ApiResponse<boolean>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<boolean>(`/api/media/${id}`, {
        method: 'DELETE',
      })
    }

    const deleted = mediaAssets.delete(id)
    return {
      ok: true,
      data: deleted,
      requestId: `local-media-delete-${id}`,
      timestamp: new Date().toISOString(),
    }
  },

  isFileSizeValid(fileSize: number, maxSize = config.storage.maxFileSize): boolean {
    return fileSize <= maxSize
  },

  getSupportedFileTypes(): Record<string, string[]> {
    return {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    }
  },
}
