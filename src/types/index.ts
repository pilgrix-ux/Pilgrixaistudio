export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  thumbnailUrl?: string
}

export interface MediaAsset {
  id: string
  projectId: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document'
  mimeType: string
  fileSize: number
  duration?: number // in seconds, for audio/video
  uploadedAt: Date
  url?: string
  thumbnail?: string
}

export interface EditorState {
  activeProjectId: string | null
  selectedAssetId: string | null
  isLoading: boolean
  error: string | null
}

export interface AIAction {
  id: string
  type: 'enhance' | 'resize' | 'filter' | 'generate' | 'transcribe'
  params: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: unknown
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}
