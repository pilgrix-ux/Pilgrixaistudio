import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FolderOpen, Search } from 'lucide-react'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'

export function SearchCreationsPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void projectService.listProjects().then((response) => {
      if (!active) return
      if (response.ok) setProjects(response.data ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return projects
    return projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(needle))
  }, [projects, query])

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50/95 font-sans text-slate-800">
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-3 pt-6">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-600 shadow-sm" aria-label="Back"><ArrowLeft size={17} /></button>
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-500">PILGRIX</p><h1 className="text-2xl font-black tracking-tight text-slate-900">Search creations</h1></div>
      </header>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-6">
        <label className="mb-4 flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-3 shadow-sm backdrop-blur-md"><Search size={17} className="text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your real projects..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label>
        <section className="min-h-0 flex-1 overflow-y-auto pb-4">
          {loading ? <p className="py-12 text-center text-xs text-slate-400">Loading your creations…</p> : results.length === 0 ? <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FolderOpen size={27} strokeWidth={1.7} /></div><h2 className="text-sm font-bold text-slate-800">Nothing found</h2><p className="mt-1 max-w-xs text-xs text-slate-400">Only real creations in your workspace are searchable.</p></div> : <div className="space-y-2.5">{results.map((project) => <article key={project.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{project.thumbnailUrl ? <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <FolderOpen size={20} className="text-slate-300" />}</div><div className="min-w-0"><h3 className="truncate text-xs font-bold text-slate-800">{project.name}</h3><p className="mt-0.5 truncate text-[10px] text-slate-400">{project.description || project.status}</p></div></article>)}</div>}
        </section>
      </div>
    </main>
  )
}
