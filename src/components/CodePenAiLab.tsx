import { useState } from 'react'
import {
  ArrowUp,
  ChevronRight,
  Folder,
  Menu,
  Mic,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react'

export function CodePenAiLab(): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [sent, setSent] = useState(false)
  const [working, setWorking] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const send = () => {
    if (!prompt.trim() || working) return
    setSent(true)
    setWorking(true)
    window.setTimeout(() => setWorking(false), 900)
  }

  const openMenuItem = (label: string) => {
    setMenuOpen(false)
    if (label === 'New creation') {
      setPrompt('')
      setSent(false)
      setWorking(false)
    }
  }

  return (
    <main className="ai-lab-view fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-slate-50/90 font-sans text-slate-800">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-200/35 via-sky-200/30 to-purple-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-64 w-64 rounded-full bg-sky-200/20 blur-2xl" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-indigo-600 active:scale-95"
          aria-label="Open workspace menu"
        >
          <Menu size={20} />
        </button>
        <div className="text-center">
          <span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-widest text-transparent">PILGRIX</span>
          <h1 className="text-sm font-bold leading-tight text-slate-900">AI Lab</h1>
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-indigo-600 active:scale-95" aria-label="Profile">
          <User size={20} />
        </button>
      </header>

      <section className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-end gap-4 overflow-hidden p-4">
          {sent && <div className="shrink-0 self-end rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-md">{prompt}</div>}
          {working && <div className="shrink-0 w-full max-w-xs rounded-2xl border border-indigo-100/90 bg-white/85 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-md"><div className="mb-1 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span><p className="text-xs font-semibold text-slate-800">Processing session request...</p></div><p className="pl-4 text-[11px] leading-relaxed text-slate-500">Applying your instructions and generating your video edit.</p></div>}
        </div>
      </section>

      <footer className="relative z-10 w-full shrink-0 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-500/10 backdrop-blur-xl">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Tell Pilgrix what you want to make..." className="w-full bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          <div className="mt-3 flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition hover:bg-slate-200/80 active:scale-95"><Plus size={16} /></button>
              <button type="button" onClick={() => setPrompt((value) => value || 'Polish this edit with clean pacing and smooth transitions.')} className="flex items-center gap-1.5 rounded-full border border-indigo-100/80 bg-gradient-to-r from-sky-50 to-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600"><Sparkles size={14} /> Magic Polish</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"><Mic size={16} /></button>
              <button type="button" disabled={!prompt.trim()} onClick={send} className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md transition active:scale-95 disabled:opacity-40"><ArrowUp size={16} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[11px] font-medium text-slate-400/90">Your media stays attached to this edit session.</p>
      </footer>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex bg-slate-900/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Workspace menu">
          <button type="button" aria-label="Close workspace menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 cursor-default" />

          <aside className="relative z-10 flex h-[100dvh] min-h-0 w-80 max-w-[88vw] flex-col justify-between border-r border-slate-200/80 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl sm:w-96">
            <div>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-widest text-transparent">PILGRIX</span>
                  <h2 className="text-xl font-bold text-slate-900">Workspace</h2>
                </div>
                <button type="button" onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition-all hover:bg-slate-200/80 hover:text-slate-800 active:scale-95" aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-3">
                <button type="button" onClick={() => openMenuItem('New creation')} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 text-left shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white"><Plus size={20} /></div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">New creation</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
                </button>

                <button type="button" onClick={() => openMenuItem('Projects')} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 text-left shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white"><Folder size={20} /></div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Projects</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-500" />
                </button>

                <button type="button" onClick={() => openMenuItem('Search creations')} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 text-left shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-colors group-hover:bg-slate-800 group-hover:text-white"><Search size={20} /></div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Search creations</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-600" />
                </button>

                <button type="button" onClick={() => openMenuItem('Settings')} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 text-left shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10">
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-colors group-hover:bg-slate-800 group-hover:text-white"><Settings size={20} /></div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Settings</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-600" />
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-200/80 pt-4">
              <div className="flex items-center justify-between rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 to-sky-50/80 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-xs font-extrabold text-white shadow-md shadow-indigo-500/20">P</div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Pilgrix Studio</p>
                    <p className="text-[10px] font-semibold text-emerald-600">3 Generations Left</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
