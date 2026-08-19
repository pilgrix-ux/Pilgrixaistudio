/** Pilgrix AI Lab — primary conversation-driven editing workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronRight, FileVideo, FolderOpen, Menu, Paperclip, Plus, Search, Settings, Sparkles, User, X } from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'

const starterPrompts = ['Make the strongest moments into one clean edit', 'Find the viral parts and cut them into one video', 'Match this video to my reference exactly']
const welcomeMessage: ChatMessage = { id: 'welcome', role: 'assistant', text: 'Tell me what you want to make. Upload your footage or describe the edit.' }

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [chatTitle, setChatTitle] = useState('New edit')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url)) }, [attachments])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setAttachments((current) => [...current, ...Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return current.filter((attachment) => attachment.id !== id)
    })
  }, [])

  const startNewChat = useCallback(() => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
    setMessages([{ ...welcomeMessage, id: crypto.randomUUID() }])
    setAttachments([])
    setPrompt('')
    setChatTitle('New edit')
    setPanel('none')
  }, [attachments])

  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && attachments.length === 0) || working) return
    const currentAttachments = [...attachments]
    setWorking(true)
    setChatTitle(trimmed ? trimmed.slice(0, 32) : 'Media analysis')
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed || `Uploaded ${currentAttachments.length} media file${currentAttachments.length === 1 ? '' : 's'}.` }])
    setPrompt('')
    try {
      const result = await editorService.requestInstruction({ projectId: 'ai-lab', instruction: trimmed || 'Analyze and prepare the uploaded media.', context: { attachments: currentAttachments.map(({ id, file }) => ({ id, filename: file.name, mimeType: file.type, size: file.size })) } })
      const message = result.error?.userMessage ?? (result.status === 'accepted' ? 'Your edit request was accepted. I will show the finished result here when rendering completes.' : `Edit request status: ${result.status}.`)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: message }])
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : 'I could not start that edit. Nothing was rendered or claimed as complete.' }])
    } finally { setWorking(false) }
  }, [attachments, prompt, working])

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-[#111]">
      <header className="sticky top-0 z-40 border-b border-black/[0.055] bg-white/90 px-4 py-3 backdrop-blur-2xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
          <button type="button" onClick={() => setPanel('menu')} className="group justify-self-start rounded-[18px] border border-black/[0.07] bg-white p-2.5 shadow-[0_4px_18px_rgba(0,0,0,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,.09)] active:scale-95" aria-label="Open workspace menu"><Menu size={21} strokeWidth={1.8} /></button>
          <button type="button" onClick={() => setPanel('projects')} className="text-center"><div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#1688d4]">PILGRIX</div><div className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em]">AI Lab</div></button>
          <button type="button" onClick={() => setPanel('account')} className="group justify-self-end rounded-[18px] border border-black/[0.07] bg-white p-2.5 shadow-[0_4px_18px_rgba(0,0,0,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,.09)] active:scale-95" aria-label="Open Me"><User size={21} strokeWidth={1.8} /></button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col px-4 pb-40 pt-7">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">Edit session</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">{chatTitle}</h2></div><button type="button" onClick={startNewChat} className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-medium shadow-[0_4px_18px_rgba(0,0,0,.05)]"><Plus size={14} /> New</button></div>
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((message) => <article key={message.id} className={`max-w-[88%] rounded-[28px] px-5 py-4 ${message.role === 'user' ? 'ml-auto bg-[#111] text-white shadow-[0_8px_24px_rgba(0,0,0,.12)]' : 'bg-white shadow-[0_8px_28px_rgba(0,0,0,.045)] ring-1 ring-black/[0.05]'}`}><p className="whitespace-pre-wrap text-[15px] leading-7">{message.text}</p></article>)}
          {attachments.length > 0 && <div className="space-y-3">{attachments.map((attachment) => <div key={attachment.id} className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_8px_28px_rgba(0,0,0,.055)] ring-1 ring-black/[0.06]">{attachment.file.type.startsWith('video/') ? <video className="max-h-[420px] w-full bg-black object-contain" controls src={attachment.url} /> : attachment.file.type.startsWith('image/') ? <img className="max-h-[420px] w-full object-contain" src={attachment.url} alt={attachment.file.name} /> : null}<div className="flex items-center justify-between gap-2 px-4 py-3 text-sm"><span className="flex min-w-0 items-center gap-2 truncate"><FileVideo size={17} /> {attachment.file.name}</span><button type="button" onClick={() => removeAttachment(attachment.id)} className="rounded-full p-2 hover:bg-black/5" aria-label={`Remove ${attachment.file.name}`}><X size={15} /></button></div></div>)}</div>}
          {working && <div className="flex max-w-[88%] items-center gap-2 rounded-[28px] bg-white px-5 py-4 text-sm text-black/50 shadow-sm ring-1 ring-black/[0.05]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#1688d4]" /> Preparing your request…</div>}
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.05] bg-[#f5f3ee]/92 p-3 backdrop-blur-2xl">
          <div className="mx-auto max-w-5xl"><div className="mb-2 flex gap-2 overflow-x-auto pb-1">{starterPrompts.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3.5 py-2.5 text-xs shadow-[0_4px_18px_rgba(0,0,0,.045)] hover:-translate-y-0.5"><Sparkles size={12} /> {item}</button>)}</div>
            <div className="relative flex items-end gap-2 rounded-[30px] border border-black/[0.08] bg-white p-2 shadow-[0_14px_45px_rgba(0,0,0,.10)] ring-1 ring-white/80"><input ref={fileInput} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} /><button type="button" onClick={() => fileInput.current?.click()} className="m-0.5 rounded-[19px] p-3 text-black/60 transition hover:bg-black/[0.05] hover:text-black" aria-label="Attach media"><Paperclip size={20} strokeWidth={1.8} /></button><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} rows={1} placeholder="Tell Pilgrix what you want to make…" className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-1 py-3 text-[15px] leading-6 outline-none placeholder:text-black/35" /><button type="button" disabled={working || (!prompt.trim() && attachments.length === 0)} onClick={() => void send()} className="m-0.5 flex h-12 w-12 items-center justify-center rounded-[19px] bg-[#111] text-white shadow-[0_7px_20px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-[#1688d4] disabled:translate-y-0 disabled:opacity-30" aria-label="Send"><ArrowUp size={20} strokeWidth={2.2} /></button></div><p className="mt-2 text-center text-[10px] tracking-wide text-black/30">Your media stays attached to this edit session.</p></div>
        </div>
      </section>

      {panel !== 'none' && <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px]" onClick={() => setPanel('none')}><aside onClick={(event) => event.stopPropagation()} className={`absolute top-0 h-full w-[90%] max-w-[390px] bg-[#fbfaf7] p-5 shadow-[20px_0_60px_rgba(0,0,0,.18)] ${panel === 'menu' || panel === 'projects' ? 'left-0' : 'right-0'}`}>
        <div className="mb-8 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#1688d4]">PILGRIX</div><div className="mt-1 text-xl font-semibold">{panel === 'menu' ? 'Workspace' : panel === 'account' ? 'Me' : panel === 'projects' ? 'Projects' : panel === 'search' ? 'Find a chat' : 'Settings'}</div></div><button type="button" onClick={() => setPanel('none')} className="rounded-full p-2 hover:bg-black/5" aria-label="Close"><X size={20} /></button></div>
        {panel === 'menu' && <div className="space-y-2">{([['New edit', Plus, () => startNewChat()], ['Projects', FolderOpen, () => setPanel('projects')], ['Search chats', Search, () => setPanel('search')], ['Settings', Settings, () => setPanel('settings')]] as const).map(([label, Icon, action]) => <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-0.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f5f7]"><Icon size={17} /></span><span className="flex-1 text-sm font-medium">{label}</span><ChevronRight size={16} className="text-black/25" /></button>)}</div>}
        {panel === 'account' && <div className="space-y-3"><div className="rounded-[26px] bg-[#111] p-5 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><User size={22} /></div><div className="mt-4 text-lg font-semibold">Your Pilgrix workspace</div><p className="mt-1 text-sm text-white/55">Account, plan and preferences live here.</p></div>{['Profile & preferences', 'Plan & usage', 'Notifications', 'Appearance'].map((item) => <button key={item} type="button" className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm shadow-sm ring-1 ring-black/[0.05]"><span>{item}</span><ChevronRight size={16} className="text-black/25" /></button>)}</div>}
        {panel === 'projects' && <div className="space-y-3"><div className="rounded-[26px] border border-dashed border-black/10 bg-white p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef6fa]"><FolderOpen size={20} className="text-[#1688d4]" /></div><h3 className="mt-4 font-semibold">Your edits</h3><p className="mt-1 text-sm leading-6 text-black/45">Finished edits and drafts will appear here as your workspace grows.</p><button type="button" onClick={startNewChat} className="mt-4 rounded-full bg-[#111] px-4 py-2 text-xs font-medium text-white">Start a new edit</button></div></div>}
        {panel === 'search' && <div><div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/[0.07]"><Search size={17} className="text-black/35" /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search your chats…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><div className="mt-5 rounded-2xl bg-white p-5 text-sm text-black/45 ring-1 ring-black/[0.05]">{searchTerm ? `Searching for “${searchTerm}”…` : 'Your saved conversations will appear here.'}</div></div>}
        {panel === 'settings' && <div className="space-y-3">{['Appearance', 'Notifications', 'Language', 'Privacy'].map((item) => <button key={item} type="button" onClick={() => setPanel('account')} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm shadow-sm ring-1 ring-black/[0.05]"><span>{item}</span><ChevronRight size={16} className="text-black/25" /></button>)}</div>}
      </aside></div>}
    </main>
  )
}
