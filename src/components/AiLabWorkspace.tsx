/** Pilgrix AI Lab — refined conversation-driven video creation workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronRight, FileVideo, FolderOpen, Menu, Mic, Plus, Search, Settings, Sparkles, User, X } from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'

const starterPrompts = ['Make the strongest moments into one clean edit', 'Find the viral parts and cut them into one video', 'Match this video to my reference']
const welcomeMessage: ChatMessage = { id: 'welcome', role: 'assistant', text: 'Tell me what you want to make. Upload your footage or describe the edit.' }

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [focused, setFocused] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [chatTitle, setChatTitle] = useState('New creation')
  const [search, setSearch] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => attachments.forEach((a) => URL.revokeObjectURL(a.url)), [attachments])
  const addFiles = useCallback((files: FileList | null) => { if (!files?.length) return; setAttachments((current) => [...current, ...Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))]) }, [])
  const removeAttachment = useCallback((id: string) => { setAttachments((current) => { const item = current.find((a) => a.id === id); if (item) URL.revokeObjectURL(item.url); return current.filter((a) => a.id !== id) }) }, [])
  const startNewChat = useCallback(() => { attachments.forEach((a) => URL.revokeObjectURL(a.url)); setMessages([{ ...welcomeMessage, id: crypto.randomUUID() }]); setAttachments([]); setPrompt(''); setChatTitle('New creation'); setPanel('none') }, [attachments])
  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && !attachments.length) || working) return
    const files = [...attachments]
    setWorking(true); setChatTitle(trimmed ? trimmed.slice(0, 30) : 'Media creation')
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed || `Uploaded ${files.length} media file${files.length === 1 ? '' : 's'}.` }]); setPrompt('')
    try {
      const result = await editorService.requestInstruction({ projectId: 'ai-lab', instruction: trimmed || 'Analyze and prepare the uploaded media.', context: { attachments: files.map(({ id, file }) => ({ id, filename: file.name, mimeType: file.type, size: file.size })) } })
      const text = result.error?.userMessage ?? (result.status === 'accepted' ? 'Your request is in the edit pipeline. The finished result will appear here when rendering completes.' : `Edit request status: ${result.status}.`)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text }])
    } catch (error) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : 'I could not start that edit.' }]) }
    finally { setWorking(false) }
  }, [attachments, prompt, working])

  const hasInput = prompt.trim().length > 0 || attachments.length > 0

  return <main className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-[#101318]">
    <header className="sticky top-0 z-40 border-b border-black/[.045] bg-white/90 px-4 py-3 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={() => setPanel('menu')} aria-label="Open menu" className="group justify-self-start rounded-[18px] border border-black/[.07] bg-white p-2.5 shadow-[0_6px_22px_rgba(15,23,42,.07)] transition hover:-translate-y-0.5 active:scale-95"><Menu size={22} strokeWidth={1.8} /></button>
        <button type="button" onClick={() => setPanel('projects')} className="text-center"><div className="text-[9px] font-bold tracking-[.36em] text-[#1688d4]">PILGRIX</div><div className="mt-0.5 text-[18px] font-semibold tracking-[-.03em]">AI Lab</div></button>
        <button type="button" onClick={() => setPanel('account')} aria-label="Open Me" className="group justify-self-end rounded-[18px] border border-black/[.07] bg-white p-2.5 shadow-[0_6px_22px_rgba(15,23,42,.07)] transition hover:-translate-y-0.5 active:scale-95"><User size={22} strokeWidth={1.8} /></button>
      </div>
    </header>

    <section className="mx-auto flex min-h-[calc(100vh-61px)] max-w-5xl flex-col px-4 pb-52 pt-9">
      <div className="mb-8">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[.28em] text-black/30">Edit session</div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[31px] font-semibold leading-[1.05] tracking-[-.055em] sm:text-[38px]">What are we creating<br className="sm:hidden" /> today?</h1>
          <button type="button" onClick={startNewChat} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-medium shadow-[0_7px_25px_rgba(15,23,42,.07)] ring-1 ring-black/[.05]"><Plus size={17} />New</button>
        </div>
      </div>

      <div className="flex-1 space-y-4 pb-5">{messages.length > 1 && messages.slice(1).map((m) => <article key={m.id} className={`max-w-[88%] rounded-[25px] px-5 py-4 ${m.role === 'user' ? 'ml-auto bg-[#111] text-white shadow-[0_8px_24px_rgba(0,0,0,.12)]' : 'bg-white shadow-[0_8px_28px_rgba(0,0,0,.045)] ring-1 ring-black/[.05]'}`}><p className="whitespace-pre-wrap text-[14px] leading-6">{m.text}</p></article>)}{working && <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-xs text-black/45 shadow-sm ring-1 ring-black/[.05]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1688d4]" />Preparing your edit request…</div>}</div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-2 sm:px-4"><div className="mx-auto max-w-5xl">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">{starterPrompts.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/95 px-4 py-2.5 text-xs shadow-[0_6px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5"><Sparkles size={11} className="text-[#00aeea]" />{item}</button>)}</div>

        <div className={`relative overflow-hidden rounded-[30px] border bg-[#f7fbff]/95 p-2 shadow-[0_16px_50px_rgba(33,55,78,.14)] backdrop-blur-xl transition-all duration-300 ${focused ? 'border-[#7fd8f5] shadow-[0_16px_55px_rgba(0,184,255,.20),0_0_0_5px_rgba(75,205,246,.10)]' : 'border-white shadow-[0_16px_50px_rgba(33,55,78,.13)]'}`}>
          <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-full bg-[#00c7ff]/10 blur-3xl" />

          {attachments.length > 0 && <div className="mb-1 flex gap-2 overflow-x-auto px-1.5 pt-1.5">{attachments.map((a) => <div key={a.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-black/[.06]">{a.file.type.startsWith('video/') ? <video className="h-full w-full object-cover" muted src={a.url} /> : a.file.type.startsWith('image/') ? <img className="h-full w-full object-cover" src={a.url} alt={a.file.name} /> : <div className="flex h-full items-center justify-center"><FileVideo size={17} className="text-[#1688d4]" /></div>}<button type="button" onClick={() => removeAttachment(a.id)} aria-label="Remove attachment" className="absolute right-0.5 top-0.5 rounded-full bg-black/65 p-0.5 text-white"><X size={10} /></button></div>)}</div>}

          <textarea value={prompt} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} rows={2} placeholder="Make Photo into Short Video" className="block min-h-[76px] w-full resize-none bg-transparent px-4 pt-3 text-[17px] leading-7 text-[#15191e] caret-[#00aeea] outline-none placeholder:text-[#a6b0bb] sm:text-[18px]" />

          <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Add media" className="flex h-12 w-12 items-center justify-center rounded-full border border-black/[.07] bg-white text-[#111] shadow-[0_4px_14px_rgba(15,23,42,.07)] transition hover:border-[#9bdff4] hover:text-[#00aeea] hover:shadow-[0_0_24px_rgba(0,196,255,.20)] active:scale-95"><Plus size={25} strokeWidth={1.8} /></button>
              <input ref={fileInput} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
              <button type="button" aria-label="More AI tools" className="flex h-12 w-12 items-center justify-center rounded-full border border-black/[.07] bg-white text-[#111] shadow-[0_4px_14px_rgba(15,23,42,.07)] transition hover:border-[#9bdff4] hover:text-[#00aeea] active:scale-95"><span className="grid grid-cols-2 gap-[4px]">{Array.from({ length: 4 }).map((_, i) => <span key={i} className="h-[5px] w-[5px] rounded-full bg-current" />)}</span></button>
            </div>

            <button type="button" disabled={working || !hasInput} onClick={() => void send()} aria-label={hasInput ? 'Create edit' : 'Voice input'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_22px_rgba(15,23,42,.16)] transition active:scale-95 ${hasInput ? 'bg-[#111] hover:bg-[#1688d4] hover:shadow-[0_0_28px_rgba(0,174,234,.30)]' : 'bg-[#111]'}`}>{hasInput ? <ArrowUp size={21} strokeWidth={2.3} /> : <Mic size={20} strokeWidth={2} />}</button>
          </div>
        </div>
      </div></div>
    </section>

    {panel !== 'none' && <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]" onClick={() => setPanel('none')}><aside onClick={(e) => e.stopPropagation()} className={`absolute top-0 h-full w-[88%] max-w-[370px] bg-[#fbfaf7] p-5 shadow-[20px_0_60px_rgba(0,0,0,.18)] ${panel === 'menu' || panel === 'search' ? 'left-0' : 'right-0'}`}><div className="mb-7 flex items-center justify-between"><div><div className="text-[9px] font-bold tracking-[.3em] text-[#1688d4]">PILGRIX</div><div className="mt-1 text-xl font-semibold">{panel === 'menu' ? 'Workspace' : panel === 'account' ? 'Me' : panel === 'projects' ? 'Projects' : panel === 'search' ? 'Search' : 'Settings'}</div></div><button type="button" onClick={() => setPanel('none')} className="rounded-full p-2 hover:bg-black/5" aria-label="Close"><X size={19} /></button></div>
      {panel === 'menu' && <div className="space-y-2">{[["New creation", Plus, () => startNewChat()], ['Projects', FolderOpen, () => setPanel('projects')], ['Search chats', Search, () => setPanel('search')], ['Settings', Settings, () => setPanel('settings')]].map(([label, Icon, action]) => <button key={String(label)} type="button" onClick={action as () => void} className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-black/[.05] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f5f7]"><Icon size={17} /></span><span className="flex-1 text-sm font-medium">{String(label)}</span><ChevronRight size={15} className="text-black/25" /></button>)}</div>}
      {panel === 'account' && <div className="space-y-3"><div className="rounded-[25px] bg-[#111] p-5 text-white"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><User size={20} /></div><div className="mt-4 text-lg font-semibold">Your workspace</div><p className="mt-1 text-sm leading-5 text-white/50">Account, plan and preferences.</p></div>{['Profile & preferences', 'Plan & usage', 'Notifications', 'Appearance'].map((item) => <button key={item} type="button" className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm shadow-sm ring-1 ring-black/[.05]"><span>{item}</span><ChevronRight size={15} className="text-black/25" /></button>)}</div>}
      {panel === 'projects' && <div className="rounded-[25px] border border-dashed border-black/10 bg-white p-6 text-center"><FolderOpen size={21} className="mx-auto text-[#1688d4]" /><h3 className="mt-3 font-semibold">Your creations</h3><p className="mt-1 text-sm leading-6 text-black/45">Drafts and finished edits will live here.</p><button type="button" onClick={startNewChat} className="mt-4 rounded-full bg-[#111] px-4 py-2 text-xs font-medium text-white">New creation</button></div>}
      {panel === 'search' && <div><div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/[.06]"><Search size={17} className="text-black/35" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your creations" className="w-full bg-transparent text-sm outline-none" /></div><p className="mt-5 text-center text-xs text-black/35">{search ? `No saved creations matching “${search}” yet.` : 'Search becomes useful as your workspace grows.'}</p></div>}
      {panel === 'settings' && <div className="space-y-2">{['Appearance', 'Notifications', 'AI preferences', 'Storage'].map((item) => <button key={item} type="button" className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm shadow-sm ring-1 ring-black/[.05]"><span>{item}</span><ChevronRight size={15} className="text-black/25" /></button>)}</div>}
    </aside></div>}
  </main>
}
