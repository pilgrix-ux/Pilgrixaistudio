/**
 * Empty state component for no projects
 */

import { Plus, Zap } from 'lucide-react'

interface EmptyStateProps {
  onCreateProject?: () => void
}

export function EmptyState({ onCreateProject }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mb-4 rounded-lg bg-brand-100 p-3">
        <Zap className="h-8 w-8 text-brand-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        No projects yet
      </h3>
      <p className="mb-6 max-w-sm text-sm text-slate-600">
        Create your first project to start editing media with AI assistance.
        Upload images, videos, audio, and documents.
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center space-x-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create Project</span>
      </button>
    </div>
  )
}
