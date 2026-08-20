import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Image, MoreVertical, Plus, Search, Trash2, Video, FolderOpen } from 'lucide-react'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'

type Tab = 'local' | 'media' | 'trash'
type Filter = 'all' | 'video' | 'photo'

export function ProjectsPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [tab, setTab] = useState<Tab>('local')
  const [filter, setFilter] = useState<Filter>('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    void projectService.listProjects().then((response) => {
      if (!active) return
      if (response.ok) setProjects(response.data ?? [])
      else setError(response.error?.userMessage ?? 'Unable to load projects.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects.filter((project) => {
      if (needle && !project.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [projects, query])

  const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50/90 font-sans text-slate-800">
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-200/40 via-sky-200/30 to-purple-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-0 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-2 pt-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md hover:text-indigo-600" aria-label="Back"><ArrowLeft size={17} /></button>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Projects</h1>
        </div>
        <div className="flex items-center gap-2">
          {searchOpen && <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-32 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs outline-none focus:border-indigo-300" />}
          <button type="button" onClick={() => setSearchOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md hover:text-indigo-600" aria-label="Search projects"><Search size={16} /></button>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md" aria-label="More options"><MoreVertical size={16} /></button>
        </div>
      </header>

      <nav className="relative z-10 mx-5 mt-2 flex shrink-0 items-center gap-6 border-b border-slate-200/70 text-xs font-extrabold text-slate-400">
        {([['local', 'Local'], ['media', 'Media'], ['trash', 'Trash']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`flex items-center gap-1.5 pb-2.5 ${tab === value ? 'border-b-2 border-indigo-600 text-indigo-600' : 'hover:text-slate-700'}`}>
            {label}{value === 'local' && projects.length > 0 && <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600">{projects.length}</span>}
          </button>
        ))}
      </nav>

      <section className="relative z-10 my-3.5 flex shrink-0 gap-2 overflow-x-auto px-5">
        {([['all', 'All'], ['video', 'Video'], ['photo', 'Photo']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${filter === value ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-500/15' : 'border border-slate-200/80 bg-white/80 text-slate-600'}`}>{label}</button>
        ))}
      </section>

      <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-2">
        <span className="text-xs font-bold text-slate-800">{tab === 'local' ? `${visibleProjects.length} project${visibleProjects.length === 1 ? '' : 's'}` : tab === 'media' ? 'Your media' : 'Recently deleted'}</span>
      </div>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-28">
        {loading && <div className="py-16 text-center text-xs font-medium text-slate-400">Loading your projects…</div>}
        {!loading && error && <div className="rounded-2xl border border-red-100 bg-white/80 p-5 text-center text-xs text-red-500">{error}</div>}
        {!loading && !error && tab === 'local' && visibleProjects.length === 0 && (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500 shadow-sm"><FolderOpen size={28} strokeWidth={1.7} /></div>
            <h2 className="text-sm font-bold text-slate-800">No projects yet</h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">Your real creations will appear here when you make one.</p>
          </div>
        )}
        {!loading && !error && tab === 'media' && (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-500"><Image size={28} strokeWidth={1.7} /></div><h2 className="text-sm font-bold text-slate-800">No media yet</h2><p className="mt-1 max-w-xs text-xs text-slate-400">Uploaded and generated images and videos will appear here.</p></div>
        )}
        {!loading && !error && tab === 'trash' && (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Trash2 size={28} strokeWidth={1.7} /></div><h2 className="text-sm font-bold text-slate-800">Trash is empty</h2><p className="mt-1 max-w-xs text-xs text-slate-400">Deleted items will stay here for 21 days before permanent removal.</p></div>
        )}
        {!loading && !error && tab === 'local' && visibleProjects.map((project) => (
          <article key={project.id} className="group mb-3 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-2.5 shadow-sm backdrop-blur-md transition hover:border-indigo-200 hover:shadow-md">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">{project.thumbnailUrl ? <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <Video size={22} className="text-slate-300" />}</div>
              <div className="min-w-0"><h4 className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600">{project.name}</h4><p className="mt-0.5 text-[11px] font-medium text-slate-400">{formatDate(project.updatedAt)}</p><span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{project.status}</span></div>
            </div>
            <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Options for ${project.name}`}><MoreVertical size={16} /></button>
          </article>
        ))}
      </main>

      <div className="fixed bottom-6 right-6 z-20"><button type="button" onClick={onBack} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-indigo-700 px-5 py-3 text-xs font-extrabold text-white shadow-xl shadow-indigo-500/30 transition hover:scale-105 active:scale-95"><Plus size={16} strokeWidth={2.5} />Create</button></div>
    </main>
  )
}
