/**
 * Project API/service layer.
 *
 * The application currently runs with a deterministic local-dev backend adapter.
 * This keeps project operations typed and organized while remaining ready for a
 * real API or backend service later.
 */

import { config } from '@/lib/config'
import { apiClient } from '@/services/apiClient'
import type {
  ApiResponse,
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from '@/types'

const projects: Map<string, Project> = new Map()

const buildProject = (
  name: string,
  description = '',
  status: Project['status'] = 'draft',
): Project => {
  const now = new Date().toISOString()
  const id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    name,
    description,
    status,
    createdAt: now,
    updatedAt: now,
    assetIds: [],
  }
}

export const projectService = {
  async createProject(
    request: CreateProjectRequest,
  ): Promise<ApiResponse<Project>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<Project>('/api/projects', {
        method: 'POST',
        body: request,
      })
    }

    const project = buildProject(request.name, request.description ?? '', request.status ?? 'draft')
    projects.set(project.id, project)

    return {
      ok: true,
      data: project,
      requestId: `local-project-${project.id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async listProjects(): Promise<ApiResponse<Project[]>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<Project[]>('/api/projects')
    }

    return {
      ok: true,
      data: Array.from(projects.values()),
      requestId: 'local-project-list',
      timestamp: new Date().toISOString(),
    }
  },

  async getProject(id: string): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<Project | null>(`/api/projects/${id}`)
    }

    const project = projects.get(id) ?? null
    return {
      ok: true,
      data: project,
      requestId: `local-project-get-${id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async updateProject(
    id: string,
    updates: UpdateProjectRequest,
  ): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<Project | null>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: updates,
      })
    }

    const project = projects.get(id)
    if (!project) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: `Project ${id} not found`,
          userMessage: 'The project could not be found.',
          status: 404,
          requestId: `local-project-update-${id}`,
          retryable: false,
        },
        requestId: `local-project-update-${id}`,
        timestamp: new Date().toISOString(),
      }
    }

    const updated: Project = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    projects.set(id, updated)

    return {
      ok: true,
      data: updated,
      requestId: `local-project-update-${id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async renameProject(id: string, name: string): Promise<ApiResponse<Project | null>> {
    return this.updateProject(id, { name })
  },

  async duplicateProject(id: string): Promise<ApiResponse<Project | null>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<Project | null>(`/api/projects/${id}/duplicate`, {
        method: 'POST',
      })
    }

    const source = projects.get(id)
    if (!source) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: `Project ${id} not found`,
          userMessage: 'The project could not be found to duplicate.',
          status: 404,
          requestId: `local-project-duplicate-${id}`,
          retryable: false,
        },
        requestId: `local-project-duplicate-${id}`,
        timestamp: new Date().toISOString(),
      }
    }

    const duplicate = buildProject(`${source.name} Copy`, source.description, source.status)
    duplicate.assetIds = [...source.assetIds]
    projects.set(duplicate.id, duplicate)

    return {
      ok: true,
      data: duplicate,
      requestId: `local-project-duplicate-${id}`,
      timestamp: new Date().toISOString(),
    }
  },

  async deleteProject(id: string): Promise<ApiResponse<boolean>> {
    if (config.api.mode !== 'local-dev') {
      return apiClient.request<boolean>(`/api/projects/${id}`, {
        method: 'DELETE',
      })
    }

    const deleted = projects.delete(id)
    return {
      ok: true,
      data: deleted,
      requestId: `local-project-delete-${id}`,
      timestamp: new Date().toISOString(),
    }
  },
}
