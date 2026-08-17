export type ProjectStatus = 'draft' | 'active' | 'archived'
export type MediaType = 'image' | 'video' | 'audio' | 'document'
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type EditorOperationType =
  | 'enhance'
  | 'resize'
  | 'filter'
  | 'generate'
  | 'transcribe'
  | 'not_configured'

export type ApiErrorCode =
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'not_found'
  | 'rate_limited'
  | 'service_unavailable'
  | 'processing_failure'
  | 'configuration_error'
  | 'unexpected_error'

export interface ApiError {
  code: ApiErrorCode
  message: string
  userMessage: string
  status: number
  requestId?: string
  details?: Record<string, unknown>
  retryable: boolean
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: ApiError
  requestId: string
  timestamp: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string
  assetIds: string[]
}

export interface CreateProjectRequest {
  name: string
  description?: string
  status?: ProjectStatus
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: ProjectStatus
}

export interface MediaAsset {
  id: string
  projectId: string
  filename: string
  mimeType: string
  mediaType: MediaType
  size: number
  duration?: number
  width?: number
  height?: number
  storageReference?: string
  createdAt: string
  previewUrl?: string
  status: 'ready' | 'processing' | 'failed'
}

export interface UploadMediaRequest {
  projectId: string
  file: File
  mediaType?: MediaType
}

export interface EditorInstructionRequest {
  projectId: string
  mediaId?: string
  instruction: string
  context?: Record<string, unknown>
  requestId?: string
}

export interface EditorInstructionResult {
  requestId: string
  status: 'accepted' | 'queued' | 'processing' | 'completed' | 'failed' | 'not_configured'
  operationType: EditorOperationType
  parameters: Record<string, unknown>
  affectedAssets: string[]
  result?: Record<string, unknown>
  error?: ApiError
}

export interface ProcessingJob {
  jobId: string
  projectId: string
  operation: string
  status: JobStatus
  progress: number
  createdAt: string
  updatedAt: string
  resultReference?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface CreateJobRequest {
  projectId: string
  operation: string
  metadata?: Record<string, unknown>
}

export interface ExportAsset {
  exportId: string
  projectId: string
  jobId: string
  filename: string
  mimeType: string
  status: 'queued' | 'processing' | 'ready' | 'failed'
  createdAt: string
  updatedAt: string
  storageReference?: string
  downloadUrl?: string
}

export interface AuthSession {
  user: SessionUser | null
  status: 'authenticated' | 'anonymous' | 'not_configured'
  token?: string
  provider?: 'supabase' | 'none'
  expiresAt?: string
}

export interface SessionUser {
  id: string
  email?: string
  name?: string
}

export interface StorageObject {
  id: string
  reference: string
  name: string
  mimeType: string
  size: number
  url?: string
  createdAt: string
}

export interface EditorState {
  activeProjectId: string | null
  selectedAssetId: string | null
  isLoading: boolean
  error: string | null
}

export interface AIAction {
  id: string
  type: EditorOperationType
  params: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_configured'
  result?: unknown
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}
