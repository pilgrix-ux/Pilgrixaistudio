/**
 * Main studio/dashboard page
 */

import { useState, useCallback } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { AIAssistantPanel } from '@/components/AIAssistantPanel'
import { EmptyState } from '@/components/EmptyState'
import { ProjectCard } from '@/components/ProjectCard'
import { MediaUpload } from '@/components/MediaUpload'
import { NewProjectModal } from '@/components/NewProjectModal'
import { projectService } from '@/services/projectService'
import { Project } from '@/types'

export function Studio(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>(() =>
    projectService.getProjects(),
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const handleCreateProject = useCallback(
    (name: string, description: string): void => {
      const newProject = projectService.createProject(name, description)
      setProjects([newProject, ...projects])
      setIsModalOpen(false)
    },
    [projects],
  )

  const handleDeleteProject = useCallback(
    (projectId: string): void => {
      projectService.deleteProject(projectId)
      setProjects(projects.filter((p) => p.id !== projectId))
    },
    [projects],
  )

  const handleSelectProject = useCallback(
    (project: Project): void => {
      setSelectedProject(project)
    },
    [],
  )

  const handleFileSelect = (files: File[]): void => {
    console.log('Files selected:', files)
    // TODO: Integrate with media service
  }

  const handleOpenNewProject = (): void => {
    setIsModalOpen(true)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <Header onNewProject={handleOpenNewProject} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {selectedProject ? (
              // Project detail view
              <div className="space-y-6">
                <div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    ← Back to Projects
                  </button>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {selectedProject.name}
                  </h2>
                  {selectedProject.description && (
                    <p className="mt-2 text-slate-600">
                      {selectedProject.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Upload media</h3>
                  <MediaUpload onFileSelect={handleFileSelect} />
                </div>

                {/* Project assets section - placeholder */}
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold text-slate-900">Project Assets</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    No assets yet. Upload media to get started.
                  </p>
                </div>
              </div>
            ) : (
              // Projects list view
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    Projects
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Manage your media editing projects
                  </p>
                </div>

                {projects.length === 0 ? (
                  <EmptyState onCreateProject={handleOpenNewProject} />
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={handleSelectProject}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* AI Assistant Panel */}
        <AIAssistantPanel />
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
}
