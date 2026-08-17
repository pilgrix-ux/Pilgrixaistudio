/**
 * Storage abstraction boundary.
 *
 * The current implementation is a deterministic local-development adapter.
 * It is intentionally separate from the app logic so a real provider such as
 * Supabase or object storage can replace it without changing consumer code.
 */

import { config } from '@/lib/config'
import type { MediaAsset, StorageObject } from '@/types'

export interface StorageAdapter {
  put: (
    file: File,
    projectId: string,
    metadata?: Partial<MediaAsset>,
  ) => Promise<StorageObject>
  get: (reference: string) => Promise<Blob | null>
  delete: (reference: string) => Promise<boolean>
  generateDownloadUrl: (reference: string) => Promise<string>
}

class LocalDevelopmentStorageAdapter implements StorageAdapter {
  private readonly records = new Map<string, StorageObject>()

  async put(
    file: File,
    projectId: string,
    metadata?: Partial<MediaAsset>,
  ): Promise<StorageObject> {
    const reference = `${projectId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const record: StorageObject = {
      id: reference,
      reference,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
      url: `/local-dev/${reference}`,
    }
    this.records.set(reference, record)

    if (metadata) {
      Object.assign(record, metadata)
    }

    return record
  }

  async get(reference: string): Promise<Blob | null> {
    const record = this.records.get(reference)
    if (!record) {
      return null
    }

    return new Blob([], { type: record.mimeType })
  }

  async delete(reference: string): Promise<boolean> {
    return this.records.delete(reference)
  }

  async generateDownloadUrl(reference: string): Promise<string> {
    const record = this.records.get(reference)
    return record?.url ?? `/local-dev/${reference}`
  }
}

export const storageService = {
  adapter: new LocalDevelopmentStorageAdapter(),

  isConfigured(): boolean {
    return config.storage.provider === 'local-dev'
  },

  async put(
    file: File,
    projectId: string,
    metadata?: Partial<MediaAsset>,
  ): Promise<StorageObject> {
    return this.adapter.put(file, projectId, metadata)
  },

  async get(reference: string): Promise<Blob | null> {
    return this.adapter.get(reference)
  },

  async delete(reference: string): Promise<boolean> {
    return this.adapter.delete(reference)
  },

  async generateDownloadUrl(reference: string): Promise<string> {
    return this.adapter.generateDownloadUrl(reference)
  },
}
