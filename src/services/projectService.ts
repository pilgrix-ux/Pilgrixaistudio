/**
 * Project service - handles project creation, deletion, and management
 */

import { Project } from '@/types'

// Simulate in-memory storage for MVP
const projects: Map<string, Project> = new Map()

export const projectService = {
  /**
   * Create a new project
   */
  createProject(name: string, description: string = ''): Project {
    const project: Project = {
      id: `project-${Date.now()}`,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    projects.set(project.id, project)
    return project
  },

  /**
   * Get all projects
   */
  getProjects(): Project[] {
    return Array.from(projects.values())
  },

  /**
   * Get project by ID
   */
  getProject(id: string): Project | undefined {
    return projects.get(id)
  },

  /**
   * Update project
   */
  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const project = projects.get(id)
    if (!project) return undefined

    const updated = {
      ...project,
      ...updates,
      id: project.id, // don't allow id change
      createdAt: project.createdAt, // don't allow date change
      updatedAt: new Date(),
    }
    projects.set(id, updated)
    return updated
  },

  /**
   * Delete project
   */
  deleteProject(id: string): boolean {
    return projects.delete(id)
  },
}
