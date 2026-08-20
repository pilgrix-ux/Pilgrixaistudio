import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Camera,
  ChevronRight,
  File,
  Folder,
  Image,
  Menu,
  Mic,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react'

type CodePenAiLabProps = {
  menuReturnSignal?: number
  onOpenProjects?: (fromMenu?: boolean) => void
  onOpenImages?: (fromMenu?: boolean) => void
  onOpenSearch?: (fromMenu?: boolean) => void
  onOpenSettings?: (fromMenu?: boolean) => void
}

type Attachment = {
  id: string
  file: File
  url: string
  kind: 'image' | 'video' | 'other'
}

function fileKind(file: File): Attachment['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return 'other'
}

export function CodePenAiLab({ menuReturnSignal = 0, onOpenProjects, onOpenImages, onOpenSearch, onOpenSettings }: CodePenAiLabProps): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [sent, setSent] = useState(false)
  const [working, setWorking] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [pickerScrolled, setPickerScrolled] = useState(false)

  const galleryRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (menuReturnSignal > 0) setMenuOpen(true)
  }, [menuReturnSignal])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const incoming = Array.from(files).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID?.() ?? Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      kind: fileKind(file),
    }))
    setAttachments((current) => [...current, ...incoming])
    setPickerOpen(true)
  }

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const item = current.find((entry) => entry.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return current.filter((entry) => entry.id !== id)
    })
  }

  const send = () => {
    if ((!prompt.trim() && attachments.length === 0) || working) return
    setSent(true)
    setWorking(true)
    setPickerOpen(false)
    window.setTimeout(() => setWorking(false), 900)
  }

  const closeMenu = () => setMenuOpen(false)

  const newCreation = () => {
    attachments.forEach((item) => URL.revokeObjectURL(item.url))
    setAttachments([])
    setPrompt('')
    setSent(false)
    setWorking(false)
    setPickerOpen(false)
    closeMenu()
  }

  const openPage = (callback?: (fromMenu?: boolean) => void, fromMenu = false) => {
    closeMenu()
    window.setTimeout(() => callback?.(fromMenu), 0)
  }

  const mediaLabel = attachments.length === 1 ? '1 item attached' : `${attachments.length} items attached`

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#f5f8fc] font-sans text-slate-800">
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-cyan-200/25 via-sky-200/25 to-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-200/15 blur-3xl" />

      <header className="relative z-20 flex shrink-0 items-center justify-between px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button type="button" onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-600 shadow-sm backdrop-blur-xl transition active:scale-95" aria-label="Open workspace menu"><Menu size={20} /></button>
        <div className="text-center"><span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.25em] text-transparent">PILGRIX</span><h1 className="text-sm font-bold leading-tight text-slate-950">AI Lab</h1></div>
        <button type="button" onClick={() => openPage(onOpenSettings)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-600 shadow-sm backdrop-blur-xl transition active:scale-95" aria-label="Open profile settings"><User size={19} /></button>
      </header>

      <section className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4 pb-8">
          <div className="flex min-h-[62vh] flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/90 bg-white/75 shadow-[0_20px_60px_rgba(56,189,248,0.16)] backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-50 to-indigo-100 text-indigo-500 shadow-inner"><Sparkles size={30} strokeWidth={1.8} /></div>
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.28em] text-sky-500">AI CREATION</p>
            <h2 className="max-w-sm text-3xl font-black tracking-[-0.04em] text-slate-950">What do you want to create?</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">Describe your idea, add real media from your device, or combine both.</p>
            <div className="mt-6 flex max-w-sm flex-wrap justify-center gap-2">
              {['Turn my clips into a short', 'Make it cinematic', 'Create an anime edit'].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)} className="rounded-full border border-white bg-white/80 px-4 py-2 text-[11px] font-semibold text-slate-600 shadow-sm transition active:scale-95">{suggestion}</button>
              ))}
            </div>
          </div>

          {sent && (
            <div className="mb-3 flex flex-col items-end gap-2">
              {attachments.length > 0 && <div className="max-w-[86%] rounded-2xl bg-white/80 px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">{mediaLabel}</div>}
              {prompt.trim() && <div className="max-w-[86%] rounded-2xl rounded-tr-sm bg-slate-950 px-4 py-3 text-xs font-medium text-white shadow-lg">{prompt}</div>}
            </div>
          )}
          {working && <div className="mb-3 w-full rounded-2xl border border-indigo-100/80 bg-white/85 p-4 shadow-xl shadow-indigo-500/5 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span><p className="text-xs font-semibold text-slate-700">Creating your edit</p></div></div>}
        </div>
      </section>

      <footer className="relative z-30 shrink-0 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white/95 bg-white/90 p-3 shadow-[0_14px_45px_rgba(30,64,175,0.12)] backdrop-blur-2xl">
          {attachments.length > 0 && (
            <div className="relative mb-2 overflow-hidden rounded-2xl bg-slate-50/80 p-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent" />
              <div className="flex gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {attachments.map((item) => (
                  <div key={item.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white bg-slate-200 shadow-sm">
                    {item.kind === 'image' ? <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" /> : item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-500"><File size={21} /></div>}
                    <button type="button" onClick={() => removeAttachment(item.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white" aria-label={`Remove ${item.file.name}`}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder="Describe what you want to create..." className="max-h-28 min-h-[42px] w-full resize-none bg-transparent px-2 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPickerOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-slate-800 transition active:scale-90" aria-label="Add media"><Plus size={21} strokeWidth={2.2} /></button>
              <button type="button" onClick={() => setPrompt((value) => value || 'Polish this edit with clean pacing and smooth transitions.')} className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-600 transition active:scale-95"><Sparkles size={14} /> Inspire</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400" aria-label="Voice input"><Mic size={18} /></button>
              <button type="button" disabled={!prompt.trim() && attachments.length === 0} onClick={send} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition active:scale-90 disabled:opacity-30" aria-label="Create"><ArrowUp size={20} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>
      </footer>

      <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
      <input ref={filesRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />

      {pickerOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/20 backdrop-blur-[3px]" onClick={() => setPickerOpen(false)}>
          <section onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-t-[32px] border border-white/90 bg-[#f7faff]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl animate-[slideUp_.22s_ease-out]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300/70" />
            <div className="mb-4 flex items-center justify-between"><div><p className="text-lg font-black tracking-tight text-slate-950">Add media</p><p className="mt-0.5 text-[11px] font-medium text-slate-400">Use real media from your device</p></div><button type="button" onClick={() => setPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm" aria-label="Close media picker"><X size={18} /></button></div>

            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white bg-white/80 shadow-sm">
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex min-h-[92px] flex-col items-center justify-center gap-2 border-r border-slate-100 text-slate-700 transition active:bg-sky-50"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Camera size={21} /></span><span className="text-xs font-bold">Camera</span></button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="flex min-h-[92px] flex-col items-center justify-center gap-2 border-r border-slate-100 text-slate-700 transition active:bg-sky-50"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Image size={21} /></span><span className="text-xs font-bold">Gallery</span></button>
              <button type="button" onClick={() => filesRef.current?.click()} className="flex min-h-[92px] flex-col items-center justify-center gap-2 text-slate-700 transition active:bg-indigo-50"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><File size={21} /></span><span className="text-xs font-bold">Files</span></button>
            </div>

            <div className="relative mt-4 max-h-[38vh] overflow-hidden rounded-2xl border border-white bg-white/70">
              <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white via-white/80 to-transparent transition-opacity duration-300 ${pickerScrolled ? 'opacity-100' : 'opacity-0'}`} />
              <div onScroll={(e) => setPickerScrolled(e.currentTarget.scrollTop > 4)} className="max-h-[38vh] overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {attachments.length > 0 ? (
                  <>
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Selected media</span><span className="text-[10px] font-semibold text-slate-400">{mediaLabel}</span></div>
                    <div className="grid grid-cols-3 gap-2">
                      {attachments.map((item) => (
                        <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                          {item.kind === 'image' ? <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" /> : item.kind === 'video' ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><File size={25} /></div>}
                          <button type="button" onClick={() => removeAttachment(item.id)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white" aria-label={`Remove ${item.file.name}`}><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="h-12" />
                  </>
                ) : (
                  <div className="min-h-[145px] px-5 py-7 text-center"><p className="text-xs font-semibold text-slate-500">Nothing selected yet</p><p className="mt-1 text-[10px] font-medium text-slate-400">Choose Camera, Gallery, or Files above.</p></div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-9 bg-gradient-to-t from-white/85 to-transparent" />
            </div>

            <button type="button" disabled={attachments.length === 0} onClick={() => setPickerOpen(false)} className="mt-4 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-lg disabled:bg-slate-200 disabled:text-slate-400">Done</button>
          </section>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex pointer-events-auto">
          <button type="button" aria-label="Close workspace menu" className="absolute inset-0 cursor-default bg-slate-950/20 backdrop-blur-[3px]" onClick={closeMenu} />
          <aside className="relative z-[101] flex h-[100dvh] w-[84vw] max-w-[390px] flex-col border-r border-white/70 bg-gradient-to-b from-white via-sky-50/95 to-indigo-50/90 shadow-[18px_0_55px_rgba(51,65,85,0.14)] backdrop-blur-2xl">
            <div className="px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))]"><div className="flex items-start justify-between"><div><span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.22em] text-transparent">PILGRIX</span><h2 className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900">Workspace</h2><p className="mt-1 text-[11px] font-medium text-slate-400">Everything for your creations</p></div><button type="button" onClick={closeMenu} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/75 text-slate-500 shadow-sm" aria-label="Close workspace"><X size={20} /></button></div></div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5"><div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Create</div><button type="button" onClick={newCreation} className="group mb-5 flex w-full items-center justify-between rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 p-3.5 text-left text-white shadow-lg shadow-sky-500/15 active:scale-[0.99]"><div className="flex items-center gap-3.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25"><Plus size={21} /></div><div><div className="text-sm font-bold">New creation</div><div className="mt-0.5 text-[10px] font-medium text-white/75">Start a new AI edit</div></div></div><ChevronRight size={18} className="text-white/75" /></button><div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Library</div><nav className="overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-sm backdrop-blur-md"><button type="button" onClick={() => openPage(onOpenProjects, true)} className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left hover:bg-white/85 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Folder size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Projects</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-sky-500" /></button><div className="mx-3.5 border-t border-slate-200/60" /><button type="button" onClick={() => openPage(onOpenImages, true)} className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left hover:bg-white/85 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500"><Image size={18} strokeWidth={1.9} /></span><div><span className="block text-sm font-semibold text-slate-700">Images</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400">Your real images</span></div></div><ChevronRight size={17} className="text-slate-300 group-hover:text-indigo-500" /></button><div className="mx-3.5 border-t border-slate-200/60" /><button type="button" onClick={() => openPage(onOpenSearch, true)} className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left hover:bg-white/85 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><Search size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Search creations</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-indigo-500" /></button></nav><div className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Account</div><nav className="overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-sm backdrop-blur-md"><button type="button" onClick={() => openPage(onOpenSettings, true)} className="group flex w-full items-center justify-between px-3.5 py-3.5 text-left hover:bg-white/85 active:bg-white"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Settings size={18} strokeWidth={1.9} /></span><span className="text-sm font-semibold text-slate-700">Settings</span></div><ChevronRight size={17} className="text-slate-300 group-hover:text-slate-600" /></button></nav></div><div className="shrink-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"><div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" /><p className="pt-3 text-center text-[10px] font-medium text-slate-400">Your workspace</p></div>
          </aside>
        </div>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: .8; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </main>
  )
}
