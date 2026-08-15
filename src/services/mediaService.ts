/**
 * Media service - handles media asset operations
 */

import { MediaAsset } from '@/types'

// Simulate in-memory storage for MVP
const mediaAssets: Map<string, MediaAsset> = new Map()

export const mediaService = {
  /**
   * Add a new media asset
   */
  addAsset(
    projectId: string,
    file: File,
    type: 'image' | 'video' | 'audio' | 'document',
  ): MediaAsset {
    const asset: MediaAsset = {
      id: `asset-${Date.now()}`,
      projectId,
      name: file.name,
      type,
      mimeType: file.type,
      fileSize: file.size,
      uploadedAt: new Date(),
    }
    mediaAssets.set(asset.id, asset)
    return asset
  },

  /**
   * Get all assets for a project
   */
  getProjectAssets(projectId: string): MediaAsset[] {
    return Array.from(mediaAssets.values()).filter(
      (asset) => asset.projectId === projectId,
    )
  },

  /**
   * Get asset by ID
   */
  getAsset(id: string): MediaAsset | undefined {
    return mediaAssets.get(id)
  },

  /**
   * Delete asset
   */
  deleteAsset(id: string): boolean {
    return mediaAssets.delete(id)
  },

  /**
   * Check if file size is within limits
   */
  isFileSizeValid(fileSize: number, maxSize: number = 104857600): boolean {
    return fileSize <= maxSize
  },

  /**
   * Get supported file types
   */
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
