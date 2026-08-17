/**
 * Project card component
 */

import { Trash2, MoreVertical } from 'lucide-react'
import { Project } from '@/types'
import { formatDate } from '@/utils/formatters'

interface ProjectCardProps {
  project: Project
  onSelect: (project: Project) => void
  onDelete: (projectId: string) => void
}

export function ProjectCard({
  project,
  onSelect,
  onDelete,
}: ProjectCardProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-32 bg-gradient-to-br from-brand-500 to-brand-600 cursor-pointer"
        onClick={() => onSelect(project)}
      >
        {project.thumbnailUrl && (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="truncate font-semibold text-slate-900">
          {project.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {formatDate(project.updatedAt)}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
          {project.description || 'No description'}
        </p>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            onClick={() => onSelect(project)}
            className="flex-1 rounded px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
          >
            Open
          </button>
          <div className="flex items-center space-x-1">
            <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
