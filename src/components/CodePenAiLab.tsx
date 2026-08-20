import { useState } from 'react'
import { ArrowUp, ChevronRight, Folder, Images, Menu, Mic, Plus, Search, Settings, Sparkles, User, X } from 'lucide-react'

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

  const newCreation = () => {
    setPrompt('')
    setSent(false)
    setWorking(false)
    setMenuOpen(false)
  }

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-slate-50/90 font-sans text-slate-800">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-200/35 via-sky-200/30 to-purple-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-64 w-64 rounded-full bg-sky-200/20 blur-2xl" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4">
        <button type="button" onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-indigo-600 active:scale-95" aria-label="Menu"><Menu size={20} /></button>
        <div className="text-center"><span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-widest text-transparent">PILGRIX</span><h1 className="text-sm font-bold leading-tight text-slate-900">AI Lab</h1></div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-indigo-600 active:scale-95" aria-label="Profile"><User size={20} /></button>
      </header>

      <section className="relative z-10 min-h-0 flex-1 overflow-hidden"><div className="mx-auto flex h-full w-full max-w-xl flex-col justify-end gap-4 overflow-hidden p-4">{sent && <div className="shrink-0 self-end rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-md">{prompt}</div>}{working && <div className="w-full max-w-xs shrink-0 rounded-2xl border border-indigo-100/90 bg-white/85 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-md"><div className="mb-1 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span><p className="text-xs font-semibold text-slate-800">Processing session request...</p></div><p className="pl-4 text-[11px] leading-relaxed text-slate-500">Applying your instructions and generating your video edit.</p></div>}</div></section>

      <footer className="relative z-10 w-full shrink-0 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"><div className="mx-auto max-w-xl rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-500/10 backdrop-blur-xl"><input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Tell Pilgrix what you want to make..." className="w-full bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400" /><div className="mt-3 flex items-center justify-between pt-1"><div className="flex items-center gap-2"><button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-600 transition hover:bg-slate-200/80 active:scale-95"><Plus size={16} /></button><button type="button" onClick={() => setPrompt((value) => value || 'Polish this edit with clean pacing and smooth transitions.')} className="flex items-center gap-1.5 rounded-full border border-indigo-100/80 bg-gradient-to-r from-sky-50 to-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600"><Sparkles size={14} /> Magic Polish</button></div><div className="flex items-center gap-2"><button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"><Mic size={16} /></button><button type="button" disabled={!prompt.trim()} onClick={send} className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md transition active:scale-95 disabled:opacity-40"><ArrowUp size={16} strokeWidth={2.5} /></button></div></div></div><p className="mt-2.5 text-center text-[11px] font-medium text-slate-400/90">Your media stays attached to this edit session.</p></footer>

      {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[3px]" onClick={() => setMenuOpen(false)}><aside className="relative flex h-[100dvh] w-[84vw] max-w-[390px] flex-col border-r border-white/70 bg-gradient-to-b from-white via-sky-50/95 to-indigo-50/90 shadow-[18px_0_55px_rgba(51,65,85,0.14)] backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]"><div className="flex items-start justify-between"><div><span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.22em] text-transparent">PILGRIX</span><h2 className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900">Workspace</h2><p className="mt-1 text-[11px] font-medium text-slate-400">Everything for your creations</p></div><button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/65 text-slate-500 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-800 active:scale-95" aria-label="Close workspace"><X size={20} /></button></div></div>
        <div className="min-h-0 flex-1 overflow-hidden px-4">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Create</div>
          <button type="button" onClick={newCreation} className="group mb-5 flex w-full items-center justify-between rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 p-3.5 text-left text-white shadow-lg shadow-sky-500/15 transition-all hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.99]"><div className="flex items-center gap-3.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25"><Plus size={21} /></div><div><div className="text-sm font-bold">New creation</div><div className="mt-0.5 text-[10px] font-medium text-white/75">Start a new AI edit</div></div></div><ChevronRight size={18} className="text-white/75" /></button>

          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Images</div>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Open Images" className="group mb-5 flex w-full items-center justify-between rounded-2xl border border-sky-100/80 bg-gradient-to-r from-white/80 via-sky-50/70 to-indigo-50/75 px-3.5 py-3.5 text-left shadow-sm shadow-sky-300/10 backdrop-blur-md transition-all hover:border-sky-200 hover:bg-white/90 hover:shadow-md hover:shadow-indigo-400/10 active:scale-[0.99]"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500"><Images size={18} strokeWidth={1.9} /></span><div><span className="block text-sm font-semibold text-slate-700">Images</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400">Create and edit visuals</span></div></div><ChevronRight size={17} className="text-slate-300 transition group-hover:text-indigo-500" /></button>

          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Library</div>
          <nav className="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm shadow-slate-300/10 backdrop-blur-md"><button type="button" className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left transition hover:bg-white/80 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Folder size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Projects</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-sky-500" /></button><div className="mx-3.5 border-t border-slate-200/60" /><button type="button" className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left transition hover:bg-white/80 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><Search size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Search creations</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-indigo-500" /></button></nav>
          <div className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</div>
          <nav className="overflow-hidden rounded-2xl border border-white/80 bg-white/60 shadow-sm shadow-slate-300/10 backdrop-blur-md"><button type="button" className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left transition hover:bg-white/80 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Settings size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Settings</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-slate-500" /></button></nav>
        </div>
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"><div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" /><p className="pt-3 text-center text-[10px] font-medium text-slate-400">Your workspace</p></div>
      </aside></div>}
    </main>
  )
}
