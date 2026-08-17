/**
 * Sidebar navigation component
 */

import { FileText, Settings, HelpCircle } from 'lucide-react'

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden border-r border-slate-200 bg-white px-4 py-6 md:block md:w-64">
      <nav className="space-y-2">
        <NavItem icon={FileText} label="Projects" active />
        <NavItem icon={Settings} label="Settings" />
        <NavItem icon={HelpCircle} label="Help & Feedback" />
      </nav>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Quick Actions
        </p>
        <div className="mt-4 space-y-2">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
            Import Media
          </button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
            View Templates
          </button>
        </div>
      </div>
    </aside>
  )
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
}

function NavItem({ icon: Icon, label, active }: NavItemProps): JSX.Element {
  return (
    <a
      href="#"
      className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors ${
        active
          ? 'bg-brand-50 text-brand-600'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
    </a>
  )
}
