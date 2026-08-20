/**
 * Project API/service layer.
 *
 * Remote mode delegates to the configured API. Local-dev mode keeps real
 * project metadata in localStorage so refreshes do not manufacture or lose
 * projects. Deleted projects are moved to a separate trash store for 21 days.
 */

import { config } from '@/lib/config'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse, CreateProjectRequest, Project, UpdateProjectRequest } from '@/types'

type DeletedProject = {
  project: Project
  deletedAt: string
}

const PROJECTS_KEY = 'pilgrix.projects.v1'
const TRASH_KEY = 'pilgrix.projects.trash.v1'
const TRASH_RETENTION_MS = 21 * 24 * 60 * 60 * 1000

const projects: Map<string, Project> = new Map()
const trash: Map<string, DeletedProject> = new Map()
let localStoreLoaded = false

const buildProject = (name: string, description = '', status: Project['status'] = 'draft'): Project => {
  const now = new Date().toISOString()
  const id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { id, name, description, status, createdAt: now, updatedAt: now, assetIds: [] }
}

function loadLocalStore(): void {
  if (localStoreLoaded || typeof window === 'undefined') return
  localStoreLoaded = true
  try {
    const storedProjects: unknown = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? '[]')
    if (Array.isArray(storedProjects)) {
      for (const value of storedProjects) {
        if (value && typeof value === 'object' && typeof (value as Project).id === 'string') projects.set((value as Project).id, value as Project)
      }
    }
    const storedTrash: unknown = JSON.parse(window.localStorage.getItem(TRASH_KEY) ?? '[]')
    if (Array.isArray(storedTrash)) {
      for (const value of storedTrash) {
        if (!value || typeof value !== 'object') continue
        const item = value as Partial<DeletedProject>
        if (item.project && typeof item.project.id === 'string' && typeof item.deletedAt === 'string') trash.set(item.project.id, item as DeletedProject)
      }
    }
    purgeExpiredTrash()
  } catch {
    // Corrupt local data is ignored; the UI will show the real remaining data.
  }
}

function persistLocalStore(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(Array.from(projects.values())))
  window.localStorage.setItem(TRASH_KEY, JSON.stringify(Array.from(trash.values())))
}

function purgeExpiredTrash(): void {
  const cutoff = Date.now() - TRASH_RETENTION_MS
  for (const [id, item] of trash) {
    if (new Date(item.deletedAt).getTime() <= cutoff) trash.delete(id)
  }
  persistLocalStore()
}

function localResponse<T>(data: T, requestId: string): ApiResponse<T> {
  return { ok: true, data, requestId, timestamp: new Date().toISOString() }
}

function notFound<T>(requestId: string, userMessage = 'The project could not be found.'): ApiResponse<T> {
  return {
    ok: false,
    error: { code: 'not_found', message: userMessage, userMessage, status: 404, requestId, retryable: false },
    requestId,
    timestamp: new Date().toISOString(),
  }
}

export const projectService = {
  async createProject(request: CreateProjectRequest): Promise<ApiResponse<Project>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project>('/api/projects', { method: 'POST', body: request })
    loadLocalStore()
    const project = buildProject(request.name, request.description ?? '', request.status ?? 'draft')
    projects.set(project.id, project)
    persistLocalStore()
    return localResponse(project, `local-project-${project.id}`)
  },

  async listProjects(): Promise<ApiResponse<Project[]>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project[]>('/api/projects')
    loadLocalStore()
    return localResponse(Array.from(projects.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), 'local-project-list')
  },

  async listTrashProjects(): Promise<ApiResponse<DeletedProject[]>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<DeletedProject[]>('/api/projects/trash')
    loadLocalStore()
    purgeExpiredTrash()
    return localResponse(Array.from(trash.values()).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)), 'local-project-trash-list')
  },

  async getProject(id: string): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project | null>(`/api/projects/${id}`)
    loadLocalStore()
    return localResponse(projects.get(id) ?? null, `local-project-get-${id}`)
  },

  async updateProject(id: string, updates: UpdateProjectRequest): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project | null>(`/api/projects/${id}`, { method: 'PATCH', body: updates })
    loadLocalStore()
    const project = projects.get(id)
    if (!project) return notFound<Project | null>(`local-project-update-${id}`)
    const updated: Project = { ...project, ...updates, updatedAt: new Date().toISOString() }
    projects.set(id, updated)
    persistLocalStore()
    return localResponse(updated, `local-project-update-${id}`)
  },

  async renameProject(id: string, name: string): Promise<ApiResponse<Project | null>> {
    return this.updateProject(id, { name })
  },

  async duplicateProject(id: string): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project | null>(`/api/projects/${id}/duplicate`, { method: 'POST' })
    loadLocalStore()
    const source = projects.get(id)
    if (!source) return notFound<Project | null>(`local-project-duplicate-${id}`, 'The project could not be found to duplicate.')
    const duplicate = buildProject(`${source.name} Copy`, source.description, source.status)
    duplicate.assetIds = [...source.assetIds]
    duplicate.thumbnailUrl = source.thumbnailUrl
    projects.set(duplicate.id, duplicate)
    persistLocalStore()
    return localResponse(duplicate, `local-project-duplicate-${id}`)
  },

  async deleteProject(id: string): Promise<ApiResponse<boolean>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<boolean>(`/api/projects/${id}`, { method: 'DELETE' })
    loadLocalStore()
    const project = projects.get(id)
    if (!project) return notFound<boolean>(`local-project-delete-${id}`)
    projects.delete(id)
    trash.set(id, { project, deletedAt: new Date().toISOString() })
    persistLocalStore()
    return localResponse(true, `local-project-delete-${id}`)
  },

  async restoreProject(id: string): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<Project | null>(`/api/projects/trash/${id}/restore`, { method: 'POST' })
    loadLocalStore()
    const item = trash.get(id)
    if (!item) return notFound<Project | null>(`local-project-restore-${id}`)
    trash.delete(id)
    projects.set(id, { ...item.project, updatedAt: new Date().toISOString() })
    persistLocalStore()
    return localResponse(projects.get(id) ?? null, `local-project-restore-${id}`)
  },

  async permanentlyDeleteProject(id: string): Promise<ApiResponse<boolean>> {
    if (config.api.mode !== 'local-dev') return apiClient.request<boolean>(`/api/projects/trash/${id}`, { method: 'DELETE' })
    loadLocalStore()
    const deleted = trash.delete(id)
    persistLocalStore()
    return localResponse(deleted, `local-project-permanent-delete-${id}`)
  },
}

export type { DeletedProject }
