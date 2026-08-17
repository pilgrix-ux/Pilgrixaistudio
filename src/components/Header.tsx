/**
 * Header component with branding and navigation
 */

interface HeaderProps {
  onNewProject?: () => void
}

export function Header({ onNewProject }: HeaderProps): JSX.Element {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-brand-600 to-brand-700">
            <span className="font-bold text-white">P</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Pilgrixaistudio</h1>
        </div>

        <nav className="hidden space-x-8 md:flex">
          <a
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Projects
          </a>
          <a
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Help
          </a>
          <a
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Settings
          </a>
        </nav>

        <button
          onClick={onNewProject}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          New Project
        </button>
      </div>
    </header>
  )
}
