/** Pilgrix AI Lab — refined conversation-driven video creation workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronRight, FileVideo, FolderOpen, Menu, Paperclip, Plus, Search, Settings, Sparkles, User, X } from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'

const starterPrompts = ['Make the strongest moments into one clean edit', 'Find the viral parts and cut them into one video', 'Match this video to my reference']
const welcomeMessage: ChatMessage = { id: 'welcome', role: 'assistant', text: 'What are we making today? Drop your footage here and tell me the feeling, story, or result you want.' }

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

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setAttachments((current) => [...current, ...Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((a) => a.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return current.filter((a) => a.id !== id)
    })
  }, [])

  const startNewChat = useCallback(() => {
    attachments.forEach((a) => URL.revokeObjectURL(a.url))
    setMessages([{ ...welcomeMessage, id: crypto.randomUUID() }])
    setAttachments([]); setPrompt(''); setChatTitle('New creation'); setPanel('none')
  }, [attachments])

  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && !attachments.length) || working) return
    const files = [...attachments]
    setWorking(true)
    setChatTitle(trimmed ? trimmed.slice(0, 30) : 'Media creation')
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed || `Uploaded ${files.length} media file${files.length === 1 ? '' : 's'}.` }])
    setPrompt('')
    try {
      const result = await editorService.requestInstruction({ projectId: 'ai-lab', instruction: trimmed || 'Analyze and prepare the uploaded media.', context: { attachments: files.map(({ id, file }) => ({ id, filename: file.name, mimeType: file.type, size: file.size })) } })
      const text = result.error?.userMessage ?? (result.status === 'accepted' ? 'Your request is in the edit pipeline. The finished result will appear here when rendering completes.' : `Edit request status: ${result.status}.`)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text }])
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : 'I could not start that edit.' }])
    } finally { setWorking(false) }
  }, [attachments, prompt, working])

  return <main className="min-h-screen overflow-x-hidden bg-[#f7f5f0] text-[#111]">
    <header className="sticky top-0 z-40 border-b border-black/[.055] bg-[#f7f5f0]/85 px-4 py-3 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={() => setPanel('menu')} aria-label="Open menu" className="group justify-self-start rounded-[17px] border border-black/[.075] bg-white/80 p-2.5 shadow-[0_5px_20px_rgba(0,0,0,.055)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,.09)] active:scale-95"><Menu size={20} strokeWidth={1.7} /></button>
        <button type="button" onClick={() => setPanel('projects')} className="text-center"><div className="text-[9px] font-bold tracking-[.34em] text-[#1688d4]">PILGRIX</div><div className="mt-0.5 text-[17px] font-semibold tracking-[-.025em]">AI Lab</div></button>
        <button type="button" onClick={() => setPanel('account')} aria-label="Open Me" className="group justify-self-end rounded-[17px] border border-black/[.075] bg-white/80 p-2.5 shadow-[0_5px_20px_rgba(0,0,0,.055)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,.09)] active:scale-95"><User size={20} strokeWidth={1.7} /></button>
      </div>
    </header>

    <section className="mx-auto flex min-h-[calc(100vh-61px)] max-w-5xl flex-col px-4 pb-48 pt-8">
      <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[17px] bg-white shadow-[0_8px_30px_rgba(0,0,0,.07)] ring-1 ring-black/[.05]"><Sparkles size={20} className="text-[#1688d4]" /></div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-black/30">AI creation studio</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-.045em] sm:text-[34px]">Make something worth watching.</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">Bring the footage. Pilgrix turns your idea into an edit.</p></div>

      <div className="flex-1 space-y-4 pb-5">{messages.length > 1 && messages.slice(1).map((m) => <article key={m.id} className={`max-w-[88%] rounded-[25px] px-5 py-4 ${m.role === 'user' ? 'ml-auto bg-[#111] text-white shadow-[0_8px_24px_rgba(0,0,0,.12)]' : 'bg-white shadow-[0_8px_28px_rgba(0,0,0,.045)] ring-1 ring-black/[.05]'}`}><p className="whitespace-pre-wrap text-[14px] leading-6">{m.text}</p></article>)}{attachments.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{attachments.map((a) => <div key={a.id} className="group relative overflow-hidden rounded-[23px] bg-white shadow-[0_8px_25px_rgba(0,0,0,.055)] ring-1 ring-black/[.06]">{a.file.type.startsWith('video/') ? <video className="max-h-64 w-full bg-black object-contain" controls src={a.url} /> : a.file.type.startsWith('image/') ? <img className="max-h-64 w-full object-contain" src={a.url} alt={a.file.name} /> : <div className="flex h-32 items-center justify-center"><FileVideo /></div>}<div className="flex items-center justify-between px-3 py-2.5 text-xs"><span className="truncate">{a.file.name}</span><button type="button" onClick={() => removeAttachment(a.id)} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Remove attachment"><X size={14} /></button></div></div>)}</div>}{working && <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-xs text-black/45 shadow-sm ring-1 ring-black/[.05]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1688d4]" />Preparing your edit request…</div>}</div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 pt-2"><div className="mx-auto max-w-5xl"><div className="mb-2 flex gap-2 overflow-x-auto pb-1">{starterPrompts.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/[.065] bg-white/90 px-3.5 py-2.5 text-xs shadow-[0_5px_20px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5"><Sparkles size={11} className="text-[#1688d4]" />{item}</button>)}</div>
        <div className={`relative overflow-hidden rounded-[30px] border bg-white/95 p-2 shadow-[0_18px_55px_rgba(0,0,0,.12)] backdrop-blur-xl transition-all duration-300 ${focused ? 'border-[#79c9ee] shadow-[0_18px_65px_rgba(22,136,212,.18),0_0_0_5px_rgba(92,202,246,.10)]' : 'border-black/[.08]'}`}>
          <div className="pointer-events-none absolute -inset-12 -z-10 bg-[radial-gradient(circle_at_50%_100%,rgba(69,181,235,.18),transparent_55%)]" />
          {attachments.length > 0 && <div className="flex gap-2 overflow-x-auto px-2 pt-2">{attachments.map((a) => <div key={a.id} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f4f5f5] px-2.5 py-1.5 text-[11px]"><FileVideo size={13} className="text-[#1688d4]" /><span className="max-w-32 truncate">{a.file.name}</span><button type="button" onClick={() => removeAttachment(a.id)} aria-label="Remove attachment"><X size={12} /></button></div>)}</div>}
          <div className="flex items-end gap-2 px-1"><button type="button" onClick={() => fileInput.current?.click()} aria-label="Add media" className="m-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] bg-[#f2f3f2] text-black/65 transition hover:bg-[#e9f7fc] hover:text-[#1688d4] hover:shadow-[0_0_22px_rgba(69,181,235,.22)]"><Plus size={21} strokeWidth={1.8} /></button><input ref={fileInput} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} /><textarea value={prompt} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} rows={2} placeholder="Describe the video you want to create…" className="max-h-32 min-h-14 flex-1 resize-none bg-transparent px-1 py-3 text-[15px] leading-6 text-[#111] caret-[#1688d4] outline-none placeholder:text-black/35" /><button type="button" disabled={working || (!prompt.trim() && !attachments.length)} onClick={() => void send()} aria-label="Create edit" className="m-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] bg-[#111] text-white shadow-[0_8px_22px_rgba(0,0,0,.17)] transition hover:-translate-y-0.5 hover:bg-[#1688d4] hover:shadow-[0_8px_26px_rgba(22,136,212,.25)] disabled:opacity-25"><ArrowUp size={19} strokeWidth={2.2} /></button></div>
          <div className="flex items-center justify-between px-3 pb-1 pt-1.5"><span className="text-[9px] font-medium tracking-[.12em] text-black/25">PILGRIX AI · VIDEO CREATION</span><span className="text-[9px] text-black/25">Enter to create · Shift + Enter for new line</span></div>
        </div></div></div>
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
